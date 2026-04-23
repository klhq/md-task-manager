import { format } from 'date-fns-tz';
import { z } from 'zod';

import logger from '../core/logger.js';
import type { Task } from '../core/types.js';

const aiTaskSchema = z.object({
  name: z.string().describe('Concise title of the task.'),
  date: z
    .string()
    .describe('YYYY-MM-DD format based on timezone. Use "" if missing.'),
  time: z.string().describe('24h HH:MM format. Use "" if missing.'),
  duration: z
    .string()
    .describe(
      'H:MM format. Default to "1:00" if date/time exist but duration is missing.',
    ),
  description: z
    .string()
    .describe('AI-generated insight/note. DO NOT include tags here.'),
  link: z
    .string()
    .describe(
      'Official resolved URL for brands (e.g., shopee.tw) or the raw URL.',
    ),
  recurrenceRule: z
    .string()
    .describe(
      'RRULE recurrence string (RFC 5545 subset). Examples: "FREQ=DAILY", "FREQ=WEEKLY;BYDAY=MO", "FREQ=WEEKLY;BYDAY=MO,WE,FR", "FREQ=WEEKLY;INTERVAL=2;BYDAY=FR", "FREQ=MONTHLY;BYMONTHDAY=15", "FREQ=YEARLY". Use "" if the task is not recurring.',
    ),
});

const getModel = async () => {
  const provider = process.env.AI_PROVIDER;
  const model = process.env.AI_MODEL;

  if (!provider) {
    throw new Error(
      'AI_PROVIDER env var is required (e.g. gemini, openai, anthropic)',
    );
  }
  if (!model) {
    throw new Error(
      'AI_MODEL env var is required (e.g. gemini-2.5-flash, gpt-4o)',
    );
  }

  switch (provider) {
    case 'gemini': {
      const { google } = await import('@ai-sdk/google');
      return google(model);
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const openai = createOpenAI({
        baseURL: process.env.OPENAI_BASE_URL,
      });
      return openai(model);
    }
    case 'anthropic': {
      const { anthropic } = await import('@ai-sdk/anthropic');
      return anthropic(model);
    }
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
  }
};

const getSystemPrompt = (timezone: string) => {
  const now = new Date();
  const todayInTz = format(now, 'yyyy-MM-dd', { timeZone: timezone });
  const dayOfWeekInTz = format(now, 'EEEE', { timeZone: timezone });

  return `
You are a high-precision Task Extraction Engine.

### CONTEXT
- Current Date: ${todayInTz}
- Current Day: ${dayOfWeekInTz}
- User Timezone: ${timezone}

### RECURRING TASK RULES
If the input implies a recurring event (e.g., "every Monday", "daily", "each weekend", "every 2 weeks"):
- Set **recurrenceRule** to an RRULE string (RFC 5545 subset). Supported: FREQ (DAILY/WEEKLY/MONTHLY/YEARLY), INTERVAL, BYDAY (MO,TU,WE,TH,FR,SA,SU), BYMONTHDAY.
- Set **date** to the NEXT occurrence from today (${todayInTz}, ${dayOfWeekInTz}).
- Examples: "every Monday" → "FREQ=WEEKLY;BYDAY=MO", "daily" → "FREQ=DAILY", "every 2 weeks on Friday" → "FREQ=WEEKLY;INTERVAL=2;BYDAY=FR", "monthly on the 15th" → "FREQ=MONTHLY;BYMONTHDAY=15".
- If the task is NOT recurring, set recurrenceRule to "".

### LOGIC & EXTRACTION RULES
1. **Date**: Convert relative terms (tomorrow, next Friday) to YYYY-MM-DD based on the ${todayInTz} context. If no date is found, return "".
2. **Time**: Convert to 24h HH:MM. If no time is found, return "".
3. **Duration (H:MM)**:
   - If Date + Time exist but no duration: Default to "1:00".
   - If Date is missing: Return "".
4. **Link Resolution**:
   - If a URL is in the text, use it.
   - If a brand is mentioned, resolve to its official domain.
   - Regional Bias: Use .tw domains for regional brands (e.g., Shopee -> https://shopee.tw) unless timezone suggests otherwise.
5. **AI Description Insight**:
   - Generate a brief (max 15 words) helpful insight, background, or instruction.
   - **STRICT RULE**: Do NOT include the user's tags in the description.

### OUTPUT
- Return ONLY valid JSON matching the schema.
`;
};

const getUserPrompt = (extractedTags: string[], userInput: string) =>
  `[PROVIDED_TAGS]: ${extractedTags.join(', ')} [USER_INPUT]: ${userInput} `;

export type AiGenTask = Omit<Task, 'completed' | 'tags'>;

export const generateAiTask = async (
  userText: string,
  tags: string[],
  timezone: string,
): Promise<AiGenTask> => {
  const { generateText, Output } = await import('ai');
  const userPrompt = getUserPrompt(tags, userText);
  try {
    const result = await generateText({
      model: await getModel(),
      output: Output.object({ schema: aiTaskSchema }),
      system: getSystemPrompt(timezone),
      prompt: userPrompt,
    });

    if (!result.output) {
      throw new Error('AI returned an empty response. Please try again.');
    }

    logger.infoWithContext(
      {
        op: 'AI_API',
        message: `Task generated successfully (provider: ${process.env.AI_PROVIDER})`,
      },
      result.output,
    );

    return result.output;
  } catch (error) {
    logger.errorWithContext({
      op: 'AI_API',
      error,
    });
    throw new Error(
      `Failed to generate task details: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

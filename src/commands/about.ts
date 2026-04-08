import { VERSION } from '../generated/changelog.js';
import { BotContext } from '../middlewares/session.js';
import { logAndReplyError } from '../utils/index.js';

const REPO_URL = 'https://github.com/klhq/md-task-manager';
const ESCAPED_VERSION = VERSION.replace(/\./g, '\\.');

export const aboutCommand = async (ctx: BotContext) => {
  try {
    const message = `
🤖 *Markdown Task Manager Bot*

*Version:* ${ESCAPED_VERSION}

A smart Telegram bot that manages your tasks in a Markdown file using AI\\. It parses natural language to extract task details, syncs with Google Calendar, and keeps everything organized\\.

*Repository:* [github\\.com/klhq/md\\-task\\-manager](${REPO_URL})

*Features:*
• AI\\-powered task parsing \\(Gemini, OpenAI, Anthropic\\)
• Google Calendar sync
• Markdown storage on GitHub
• Timezone\\-aware scheduling
• Natural language processing

*Commands:* Use /start to see available commands

*Report Issues:* [GitHub Issues](${REPO_URL}/issues)
*Contribute:* [Pull Requests Welcome](${REPO_URL}/pulls)
    `.trim();

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logAndReplyError(ctx, 'ABOUT', error, '❌ Error showing bot information.');
  }
};

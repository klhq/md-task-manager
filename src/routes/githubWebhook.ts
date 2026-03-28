import type { Context } from 'hono';
import type { Telegraf } from 'telegraf';
import { handleGitHubWebhook } from '../services/githubWebhookHandler.js';
import { BotContext } from '../middlewares/session.js';

export const githubWebhookHandler = async (
  c: Context,
  bot: Telegraf<BotContext>,
) => {
  const body = c.get('parsedBody');
  await handleGitHubWebhook(body, bot as Telegraf<BotContext>);
  return c.json({ success: true }, 200);
};

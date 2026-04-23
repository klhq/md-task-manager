import type { Bot } from 'grammy';
import type { Context } from 'hono';
import type { BotContext } from '../middlewares/session.js';
import { handleGitHubWebhook } from '../services/githubWebhookHandler.js';

export const githubWebhookHandler = async (
  c: Context,
  bot: Bot<BotContext>,
) => {
  const body = c.get('parsedBody');
  await handleGitHubWebhook(body, bot);
  return c.json({ success: true }, 200);
};

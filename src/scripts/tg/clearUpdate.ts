import logger from '../../core/logger.js';
import { closeAgent, tgFetch } from './utils.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL;
const secret = process.env.BOT_SECRET;

if (!token || !webhookUrl) {
  logger.errorWithContext({
    message: 'Missing TELEGRAM_BOT_TOKEN or WEBHOOK_URL in env file',
  });
  throw new Error('Missing env vars');
}

void (async () => {
  try {
    logger.infoWithContext({
      message: `Clearing updates for webhook: ${webhookUrl}`,
    });
    const url = new URL(`https://api.telegram.org/bot${token}/setWebhook`);
    url.searchParams.set('url', webhookUrl);
    url.searchParams.set('drop_pending_updates', 'true');
    if (secret) {
      url.searchParams.set('secret_token', secret);
    }

    const response = await tgFetch(url.toString(), {
      method: 'POST',
    });
    logger.infoWithContext(
      {
        message: 'Clear updates response',
        op: 'clearUpdate',
      },
      response,
    );
  } catch (error) {
    logger.errorWithContext({
      message: 'Error clearing updates',
      op: 'clearUpdate',
      error,
    });
  } finally {
    await closeAgent();
  }
})();

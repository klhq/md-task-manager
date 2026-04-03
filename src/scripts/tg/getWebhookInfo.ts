import logger from '../../core/logger.js';
import { closeAgent, tgFetch } from './utils.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  logger.errorWithContext({
    message: 'Missing TELEGRAM_BOT_TOKEN in env file',
  });
  throw new Error('Missing TELEGRAM_BOT_TOKEN');
}

const url = `https://api.telegram.org/bot${token}/getWebhookInfo`;

void (async () => {
  try {
    const data = await tgFetch(url, { method: 'GET' });
    logger.infoWithContext(
      {
        message: 'Webhook Info',
        op: 'getWebhookInfo',
      },
      data,
    );
  } catch (error) {
    logger.errorWithContext({
      message: 'Failed to get webhook info',
      op: 'getWebhookInfo',
      error,
    });
  } finally {
    await closeAgent();
  }
})();

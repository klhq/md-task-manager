import 'dotenv/config';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { IS_PROD } from './core/config.js';
import logger from './core/logger.js';
import { AppError } from './core/error.js';

import bot from './bot.js';
import { verifyCron } from './middlewares/verifyCron.js';
import { verifyGithubWebhook } from './middlewares/verifyGithubWebhook.js';
import { healthHandler } from './routes/health.js';
import { cronHandler } from './routes/cron.js';
import { githubWebhookHandler } from './routes/githubWebhook.js';

// Environment configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const BOT_SECRET = process.env.BOT_SECRET;

if (!token) {
  logger.errorWithContext({ message: 'TELEGRAM_BOT_TOKEN is required!' });
  process.exit(1);
}

type Variables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedBody: any;
};

const app = new Hono<{ Variables: Variables }>();

// Log incoming requests
app.use(async (c, next) => {
  logger.debugWithContext({
    message: `${c.req.method} ${c.req.url}`,
  });
  await next();
});

// Telegram webhook
app.post('/api', async (c) => {
  const secretToken = c.req.header('x-telegram-bot-api-secret-token');
  if (BOT_SECRET && secretToken !== BOT_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const update = await c.req.json();
  await bot.handleUpdate(update);
  return c.json({ ok: true });
});

// Routes
app.get('/api', healthHandler);
app.get('/api/cron', verifyCron, async (c) => cronHandler(c, bot));
app.post('/api/github-webhook', verifyGithubWebhook, async (c) =>
  githubWebhookHandler(c, bot),
);

// 404 handler
app.notFound((c) => {
  return c.json(
    { error: 'Not Found', message: 'The requested endpoint does not exist' },
    404,
  );
});

// Global error handler
app.onError((err, c) => {
  logger.errorWithContext({
    op: 'APP_ERROR',
    error: err.message,
  });

  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const message = isOperational ? err.message : 'Internal Server Error';

  return c.json(
    {
      error: message,
      ...(!IS_PROD && { stack: err.stack }),
    },
    statusCode as ContentfulStatusCode,
  );
});

// Local development server
if (!IS_PROD) {
  const { serve } = await import('@hono/node-server');
  const PORT = Number(process.env.PORT) || 3000;

  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    logger.infoWithContext({
      message: `Server running on http://localhost:${PORT}`,
    });
    logger.infoWithContext({
      message: 'Webhook endpoint ready at /api',
    });
  });

  const gracefulShutdown = (signal: string) => {
    logger.infoWithContext({
      message: `${signal} received, shutting down gracefully`,
    });

    server.close(() => {
      logger.infoWithContext({ message: 'Server closed successfully' });
      bot.stop(signal);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;

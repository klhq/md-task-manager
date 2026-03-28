import type { Context } from 'hono';

export const healthHandler = (c: Context) => {
  return c.json({
    status: 'ok',
    message: 'Bot webhook server',
    timestamp: new Date().toISOString(),
  });
};

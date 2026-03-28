import type { Context, Next } from 'hono';
import { AppError } from '../core/error.js';

export const verifyCron = async (c: Context, next: Next) => {
  const authHeader = c.req.header('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw new AppError('Unauthorized', 401);
  }
  await next();
};

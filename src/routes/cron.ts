import type { Context } from 'hono';
import type { Telegraf } from 'telegraf';
import logger from '../core/logger.js';
import { ALLOWED_USERS } from '../core/config.js';
import { queryTasks } from '../services/queryTasks.js';
import { getTasksByDay } from '../utils/index.js';
import { getTodaysTasksMessage } from '../views/generalView.js';
import { BotContext } from '../middlewares/session.js';

export const cronHandler = async (c: Context, bot: Telegraf<BotContext>) => {
  const { taskData, metadata } = await queryTasks();

  if (!metadata.timezone) {
    logger.warnWithContext({
      message: 'Timezone not set - skipping notification',
    });
    return c.json({ success: true, message: 'Timezone not set' }, 200);
  }

  const now = new Date();
  const dailyTasks = getTasksByDay(
    taskData.uncompleted,
    now,
    metadata.timezone,
  );

  if (dailyTasks.length === 0) {
    logger.infoWithContext({
      message: 'No tasks for today, skipping notification',
    });
    return c.json({ success: true, message: 'No tasks for today' }, 200);
  }

  const message = getTodaysTasksMessage(
    dailyTasks,
    metadata.timezone,
    '🔔',
    'Daily Reminder',
  );

  await bot.telegram.sendMessage(ALLOWED_USERS[0], message, {
    parse_mode: 'MarkdownV2',
  });

  return c.json({ success: true, notified: ALLOWED_USERS[0] }, 200);
};

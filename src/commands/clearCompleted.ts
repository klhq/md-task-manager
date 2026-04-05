import { BotContext } from '../middlewares/session.js';
import { Command } from '../core/config.js';
import { saveTasks } from '../services/saveTasks.js';
import { queryTasks } from '../services/queryTasks.js';
import { logAndReplyError } from '../utils/index.js';

export const clearCompletedCommand = async (ctx: BotContext) => {
  try {
    ctx.chatAction = 'typing';
    const { taskData, metadata } = await queryTasks();
    taskData.completed = [];
    const success = await saveTasks(taskData, metadata);
    if (success) {
      ctx.reply('Cleared all completed tasks!');
    } else {
      ctx.reply('❌ Failed to clear completed tasks.');
    }
  } catch (error) {
    logAndReplyError(
      ctx,
      Command.CLEARCOMPLETED,
      error,
      '❌ Failed to clear completed tasks.',
    );
  }
};

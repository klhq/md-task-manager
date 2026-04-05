import { BotContext } from '../middlewares/session.js';
import { getTasksByDay, logAndReplyError } from '../utils/index.js';
import { Command } from '../core/config.js';
import { queryTasks } from '../services/queryTasks.js';
import { getTodaysTasksMessage } from '../views/generalView.js';

export const todayCommand = async (ctx: BotContext) => {
  try {
    ctx.chatAction = 'typing';
    const { taskData, metadata } = await queryTasks();

    if (!metadata.timezone) {
      return ctx.reply(
        '❌ Timezone not set. Please set your timezone first using /settimezone command.',
      );
    }

    const today = new Date();
    const todaysTasks = getTasksByDay(
      taskData.uncompleted,
      today,
      metadata.timezone,
    );

    if (todaysTasks.length === 0) {
      return ctx.reply('📭 No tasks for today!');
    }

    const response = getTodaysTasksMessage(todaysTasks, metadata.timezone!);

    ctx.reply(response, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logAndReplyError(
      ctx,
      Command.TODAY,
      error,
      "❌ Failed to get today's tasks.",
    );
  }
};

import { BotContext } from '../middlewares/session.js';
import { Command } from '../core/config.js';
import { queryTasks } from '../services/queryTasks.js';
import { generateSortKeyboard } from '../actions/sort.js';
import { logAndReplyError } from '../utils/index.js';

export const sortCommand = async (ctx: BotContext) => {
  try {
    const { taskData } = await queryTasks();

    if (taskData.uncompleted.length === 0) {
      return ctx.reply('📭 No tasks to sort.');
    }

    await ctx.reply(
      '🔀 *Sort Tasks*\n\nChoose how to sort your uncompleted tasks:',
      {
        parse_mode: 'MarkdownV2',
        reply_markup: generateSortKeyboard(),
      },
    );
  } catch (error) {
    logAndReplyError(
      ctx,
      Command.SORT,
      error,
      '❌ Error loading tasks. Please try again.',
    );
  }
};

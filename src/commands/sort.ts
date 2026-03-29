import { BotContext } from '../middlewares/session.js';
import { Command } from '../core/config.js';
import { queryTasks } from '../services/queryTasks.js';
import logger from '../core/logger.js';
import { generateSortKeyboard } from '../actions/sort.js';

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
    ctx.reply('❌ Error loading tasks. Please try again.');
    logger.errorWithContext({ userId: ctx.from?.id, op: Command.SORT, error });
  }
};

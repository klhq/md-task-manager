import { BotContext } from '../middlewares/session.js';
import logger from '../core/logger.js';
import { extractArg, formatTaskListStr, parseTags } from '../utils/index.js';
import { Command } from '../core/config.js';
import { NO_TASK_MESSAGE } from '../views/generalView.js';
import { queryTasks } from '../services/queryTasks.js';
import { Task } from '../core/types.js';

export const listCommand = async (ctx: BotContext) => {
  try {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text! : '';
    const arg = extractArg(text, Command.LIST).trim();

    const { taskData } = await queryTasks();

    let tasksToDisplay: Task[];
    let title: string;
    let showStatus = false;

    if (!arg) {
      // Default: show pending tasks
      tasksToDisplay = taskData.uncompleted;
      title = '📋 *Pending Tasks*';
    } else if (arg.toLowerCase() === 'all') {
      // Show all tasks
      tasksToDisplay = taskData.uncompleted.concat(taskData.completed);
      title = '📚 *All Tasks*';
      showStatus = true;
    } else {
      // Filter by tags
      const filterTags = parseTags(arg);
      if (filterTags.length === 0) {
        return ctx.reply(
          '❌ Invalid filter. Use /list, /list all, or /list #tag',
        );
      }

      tasksToDisplay = taskData.uncompleted.filter((task) =>
        filterTags.every((filterTag) =>
          task.tags.some((taskTag) => taskTag.toLowerCase() === filterTag),
        ),
      );

      const tagStr = filterTags.map((t) => `#${t}`).join(' ');
      title = `🏷️ *Tasks with ${tagStr}*`;
    }

    if (tasksToDisplay.length === 0) {
      return ctx.reply(NO_TASK_MESSAGE);
    }

    const message = `${title}\n\n${formatTaskListStr(tasksToDisplay, showStatus)}`;

    ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logger.errorWithContext({ userId: ctx.from?.id, op: Command.LIST, error });
    ctx.reply('❌ Error fetching tasks');
  }
};

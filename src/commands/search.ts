import { BotContext } from '../middlewares/session.js';
import {
  escapeMarkdownV2,
  extractArg,
  formatTaskListStr,
  logAndReplyError,
} from '../utils/index.js';
import { Command } from '../core/config.js';
import { queryTasks } from '../services/queryTasks.js';

export const searchCommand = async (ctx: BotContext) => {
  try {
    ctx.chatAction = 'typing';
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text! : '';
    const arg = extractArg(text, Command.SEARCH).trim();

    if (!arg) {
      return ctx.reply('Usage: /search <keyword>\nExample: /search meeting');
    }

    const words = arg.toLowerCase().split(/\s+/);

    const { taskData } = await queryTasks();

    const allTasks = taskData.uncompleted.concat(taskData.completed);
    const matches = allTasks.filter((task) => {
      const haystack = `${task.name} ${task.description}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });

    if (matches.length === 0) {
      return ctx.reply(`No tasks found matching "${arg}".`);
    }

    const escaped = escapeMarkdownV2(arg);
    const message = `🔍 *Search results for "${escaped}":*\n\n${formatTaskListStr(matches, true)}`;

    ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logAndReplyError(ctx, Command.SEARCH, error, '❌ Error searching tasks.');
  }
};

import { Command } from '../core/config.js';
import {
  extractArg,
  findTaskIdxByName,
  logAndReplyError,
  markTaskCompleted,
} from '../utils/index.js';
import {
  getNoTextMessage,
  NO_TASK_MESSAGE,
  TASK_NOT_FOUND_MESSAGE,
} from '../views/generalView.js';
import { queryTasks } from '../services/queryTasks.js';
import { saveTasks } from '../services/saveTasks.js';
import { BotContext } from '../middlewares/session.js';
import { generateTaskPickerKeyboard } from '../actions/taskPicker.js';

export const completeCommand = async (ctx: BotContext) => {
  try {
    if (!ctx.message || !('text' in ctx.message)) {
      return ctx.reply(getNoTextMessage(Command.COMPLETE));
    }

    const text = ctx.message.text!;
    const arg = extractArg(text, Command.COMPLETE);

    if (!arg) {
      const { taskData } = await queryTasks();
      if (taskData.uncompleted.length === 0) return ctx.reply(NO_TASK_MESSAGE);
      return ctx.reply('Select a task to complete:', {
        reply_markup: generateTaskPickerKeyboard(
          taskData.uncompleted,
          'complete',
          'u',
          0,
        ),
      });
    }

    const { taskData, metadata } = await queryTasks();
    const taskIdx = findTaskIdxByName(taskData.uncompleted, arg);
    if (taskIdx === -1) {
      return ctx.reply(TASK_NOT_FOUND_MESSAGE);
    }

    markTaskCompleted(taskData.uncompleted[taskIdx], metadata.timezone);
    await saveTasks(taskData, metadata);

    ctx.reply(`✅ Completed: ${arg}`);
  } catch (error) {
    logAndReplyError(
      ctx,
      Command.COMPLETE,
      error,
      '❌ Error completing task. Please try again.',
    );
  }
};

import { Composer, InlineKeyboard } from 'grammy';
import { format } from 'date-fns-tz';
import { Task, TaskData } from '../core/types.js';
import { BotContext, setPendingCalendarOps } from '../middlewares/session.js';
import { enterEditScene } from '../scenes/editTaskScene.js';
import { queryTasks } from '../services/queryTasks.js';
import { saveTasks } from '../services/saveTasks.js';

const TASKS_PER_PAGE = 8;
const MAX_NAME_LENGTH = 28;

type PickerCommand = 'complete' | 'remove' | 'edit';
type TaskType = 'u' | 'c';

const truncate = (name: string, max: number) =>
  name.length > max ? name.slice(0, max - 1) + '…' : name;

// --- Keyboard generators ---

export const generateTaskPickerKeyboard = (
  tasks: Task[],
  command: PickerCommand,
  taskType: TaskType,
  page: number,
): InlineKeyboard => {
  const start = page * TASKS_PER_PAGE;
  const pageTasks = tasks.slice(start, start + TASKS_PER_PAGE);
  const keyboard = new InlineKeyboard();

  for (const [i, task] of pageTasks.entries()) {
    const idx = start + i;
    const label = truncate(task.name, MAX_NAME_LENGTH);
    keyboard.text(label, `pick_${command}_${taskType}_${idx}`).row();
  }

  // Pagination
  const hasPrev = page > 0;
  const hasNext = start + TASKS_PER_PAGE < tasks.length;
  if (hasPrev || hasNext) {
    if (hasPrev) keyboard.text('◀ Prev', `pick_${command}_page_${page - 1}`);
    if (hasNext) keyboard.text('Next ▶', `pick_${command}_page_${page + 1}`);
    keyboard.row();
  }

  keyboard.text('❌ Cancel', `pick_${command}_cancel`);
  return keyboard;
};

export const generateRemovePickerKeyboard = (
  taskData: TaskData,
  page: number,
): InlineKeyboard => {
  const combined: { task: Task; type: TaskType; idx: number }[] = [
    ...taskData.uncompleted.map((t, i) => ({
      task: t,
      type: 'u' as TaskType,
      idx: i,
    })),
    ...taskData.completed.map((t, i) => ({
      task: t,
      type: 'c' as TaskType,
      idx: i,
    })),
  ];

  const start = page * TASKS_PER_PAGE;
  const pageTasks = combined.slice(start, start + TASKS_PER_PAGE);
  const keyboard = new InlineKeyboard();

  for (const { task, type, idx } of pageTasks) {
    const prefix = type === 'c' ? '✅ ' : '';
    const label = prefix + truncate(task.name, MAX_NAME_LENGTH - prefix.length);
    keyboard.text(label, `pick_remove_${type}_${idx}`).row();
  }

  const hasPrev = page > 0;
  const hasNext = start + TASKS_PER_PAGE < combined.length;
  if (hasPrev || hasNext) {
    if (hasPrev) keyboard.text('◀ Prev', `pick_remove_page_${page - 1}`);
    if (hasNext) keyboard.text('Next ▶', `pick_remove_page_${page + 1}`);
    keyboard.row();
  }

  keyboard.text('❌ Cancel', `pick_remove_cancel`);
  return keyboard;
};

// --- Callback handler ---

export const registerTaskPickerAction = (composer: Composer<BotContext>) => {
  composer.callbackQuery(
    /^pick_(complete|remove|edit)_(u_\d+|c_\d+|page_\d+|cancel)$/,
    async (ctx) => {
      const command = ctx.match[1] as PickerCommand;
      const action = ctx.match[2];

      await ctx.answerCallbackQuery();

      // Cancel
      if (action === 'cancel') {
        await ctx.editMessageText(`❌ ${capitalize(command)} cancelled.`);
        return;
      }

      // Pagination
      if (action.startsWith('page_')) {
        const page = parseInt(action.split('_')[1], 10);
        const { taskData } = await queryTasks();

        let keyboard: InlineKeyboard;
        if (command === 'remove') {
          keyboard = generateRemovePickerKeyboard(taskData, page);
        } else {
          keyboard = generateTaskPickerKeyboard(
            taskData.uncompleted,
            command,
            'u',
            page,
          );
        }

        await ctx.editMessageReplyMarkup({
          reply_markup: keyboard,
        });
        return;
      }

      // Task selection: parse type and index
      const [taskType, idxStr] = action.split('_') as [TaskType, string];
      const idx = parseInt(idxStr, 10);
      const { taskData, metadata } = await queryTasks();

      const tasks =
        taskType === 'u' ? taskData.uncompleted : taskData.completed;

      if (idx < 0 || idx >= tasks.length) {
        await ctx.editMessageText(
          '⚠️ Task list has changed. Please try the command again.',
        );
        return;
      }

      const task = tasks[idx];

      if (command === 'complete') {
        await handleComplete(ctx, taskData, metadata, task);
      } else if (command === 'remove') {
        await handleRemove(ctx, taskData, metadata, taskType, idx, task);
      } else if (command === 'edit') {
        await ctx.editMessageText(`✏️ Editing: ${task.name}`);
        await enterEditScene(ctx, idx);
      }
    },
  );
};

// --- Command handlers ---

const handleComplete = async (
  ctx: BotContext,
  taskData: TaskData,
  metadata: { timezone?: string },
  task: Task,
) => {
  task.completed = true;
  const now = new Date();
  const completedAt = format(now, 'yyyy-MM-dd HH:mm:ss', {
    timeZone: metadata.timezone,
  });
  task.log = `Completed ${completedAt} (${metadata.timezone})`;
  await saveTasks(taskData, metadata);
  await ctx.editMessageText(`✅ Completed: ${task.name}`);
};

const handleRemove = async (
  ctx: BotContext,
  taskData: TaskData,
  metadata: { timezone?: string },
  taskType: TaskType,
  idx: number,
  task: Task,
) => {
  const calendarEventId = task.calendarEventId;
  const list = taskType === 'u' ? 'uncompleted' : 'completed';
  taskData[list].splice(idx, 1);
  await saveTasks(taskData, metadata);

  await ctx.editMessageText(`🗑️ Removed: ${task.name}`);

  if (calendarEventId) {
    setPendingCalendarOps(ctx.from!.id, [
      { type: 'remove', taskName: task.name, calendarEventId },
    ]);
    await ctx.reply('Remove corresponding Google Calendar Event?', {
      reply_markup: new InlineKeyboard()
        .text('Yes', 'cal_yes')
        .text('No', 'cal_no'),
    });
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

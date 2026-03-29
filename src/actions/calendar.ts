import { Composer } from 'grammy';
import {
  BotContext,
  getPendingCalendarOps,
  clearPendingCalendarOps,
} from '../middlewares/session.js';
import { googleCalendarService } from '../clients/google-calendar.js';
import { queryTasks } from '../services/queryTasks.js';
import { saveTasks } from '../services/saveTasks.js';
import { findTaskIdxByName } from '../utils/index.js';
import logger from '../core/logger.js';
import { Task } from '../core/types.js';

export const registerCalendarAction = (composer: Composer<BotContext>) => {
  composer.callbackQuery(['cal_yes', 'cal_no'], async (ctx) => {
    const action = ctx.match;
    const isYes = action === 'cal_yes';
    const userId = ctx.from!.id;
    const ops = getPendingCalendarOps(userId);

    await ctx.answerCallbackQuery();

    if (!ops || ops.length === 0) {
      await ctx.editMessageReplyMarkup(undefined);
      return;
    }

    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch (e) {
      if (e instanceof Error) {
        logger.debugWithContext({
          message: `Failed to remove keyboard: ${e.message}`,
        });
      }
    }

    if (!isYes) {
      await ctx.deleteMessage();
      clearPendingCalendarOps(userId);
      return;
    }

    try {
      const { metadata, taskData } = await queryTasks();

      if (!metadata.timezone) {
        await ctx.reply(
          '❌ Timezone not set. Please use /settimezone then click Yes again.',
        );
        return;
      }

      // Process operations
      let successCount = 0;
      let failCount = 0;

      for (const op of ops) {
        try {
          if (op.type === 'add') {
            const taskIdx = findTaskIdxByName(
              taskData.uncompleted,
              op.taskName,
            );
            if (taskIdx === -1) {
              failCount++;
              continue;
            }
            const task = taskData.uncompleted[taskIdx];

            if (!task.date || !task.time) {
              failCount++;
              continue;
            }

            const eventId = await googleCalendarService.createEvent(
              task,
              metadata.timezone,
            );
            if (eventId) {
              task.calendarEventId = eventId;
              successCount++;
            } else {
              failCount++;
            }
          } else if (op.type === 'remove') {
            if (op.calendarEventId) {
              const success = await googleCalendarService.deleteEvent(
                op.calendarEventId,
              );
              if (success) successCount++;
              else failCount++;
            }
          } else if (op.type === 'update') {
            let taskIdx = findTaskIdxByName(taskData.uncompleted, op.taskName);
            let task: Task | undefined;

            if (taskIdx !== -1) {
              task = taskData.uncompleted[taskIdx];
            } else {
              taskIdx = findTaskIdxByName(taskData.completed, op.taskName);
              if (taskIdx !== -1) {
                task = taskData.completed[taskIdx];
              }
            }

            if (!task) {
              failCount++;
              continue;
            }

            if (op.calendarEventId) {
              const eventId = await googleCalendarService.updateEvent(
                op.calendarEventId,
                task,
                metadata.timezone,
              );
              if (eventId) {
                if (eventId !== task.calendarEventId) {
                  task.calendarEventId = eventId;
                }
                successCount++;
              } else {
                failCount++;
              }
            }
          }
        } catch (e) {
          logger.errorWithContext({
            userId,
            op: 'CALENDAR_BATCH_ITEM',
            error: e,
          });
          failCount++;
        }
      }

      // Save once after all ops
      if (successCount > 0) {
        await saveTasks(taskData, metadata);
      }

      await ctx.reply(
        `✅ Processed ${successCount} calendar operations.` +
          (failCount > 0 ? ` (Failed: ${failCount})` : ''),
      );
    } catch (error) {
      logger.errorWithContext({ userId, op: 'CALENDAR_ACTION', error });
      await ctx.reply('❌ An error occurred.');
    }

    clearPendingCalendarOps(userId);
  });
};

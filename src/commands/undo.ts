import { Command } from '../core/config.js';
import { logAndReplyError } from '../utils/index.js';
import { saveTasks } from '../services/saveTasks.js';
import { getUndoSnapshot, clearUndoSnapshot } from '../services/undoStore.js';
import { BotContext } from '../middlewares/session.js';

export const undoCommand = async (ctx: BotContext) => {
  try {
    ctx.chatAction = 'typing';

    const snapshot = getUndoSnapshot(ctx.from!.id);
    if (!snapshot) {
      return ctx.reply('Nothing to undo.');
    }

    await saveTasks(snapshot.taskData, snapshot.metadata, { skipUndo: true });
    clearUndoSnapshot(ctx.from!.id);

    await ctx.reply('↩️ Last action undone.');
  } catch (error) {
    logAndReplyError(
      ctx,
      Command.UNDO,
      error,
      '❌ Error undoing last action. Please try again.',
    );
  }
};

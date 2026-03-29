import { Context, Middleware, Scenes } from 'telegraf';
import { CalendarOpSession, EditableField } from '../core/types.js';

export type { CalendarOpSession } from '../core/types.js';

// --- EditScene state (used by the grammy Composer that replaces Telegraf scenes) ---

export interface EditSceneState {
  active: boolean;
  taskIdx: number;
  field?: EditableField;
}

// --- Session types ---

export interface SessionData extends Scenes.SceneSession<Scenes.SceneSessionData> {
  editScene?: EditSceneState;
}

export interface BotContext extends Scenes.SceneContext {
  session: SessionData;
}

// Re-declare for simple-context callers (merged via declaration merging)
export interface BotContext extends Context {
  session: SessionData;
}

// --- Telegraf session middleware (kept until bot.ts migrates) ---

const sessions = new Map<string, SessionData>();

const getSessionKey = (ctx: Context): string | undefined => {
  const fromId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!fromId || !chatId) {
    return undefined;
  }
  return `${fromId}:${chatId}`;
};

export const sessionMiddleware = (): Middleware<BotContext> => {
  return async (ctx, next) => {
    const key = getSessionKey(ctx);
    if (!key) {
      ctx.session = {};
      return next();
    }

    let session = sessions.get(key);
    if (!session) {
      session = {};
      sessions.set(key, session);
    }

    ctx.session = session;
    await next();
  };
};

// --- Standalone pending calendar ops ---

const pendingCalendarOps = new Map<number, CalendarOpSession[]>();

export const setPendingCalendarOps = (
  telegramId: number,
  ops: CalendarOpSession[],
): void => {
  pendingCalendarOps.set(telegramId, ops);
};

export const getPendingCalendarOps = (
  telegramId: number,
): CalendarOpSession[] | undefined => {
  return pendingCalendarOps.get(telegramId);
};

export const clearPendingCalendarOps = (telegramId: number): void => {
  pendingCalendarOps.delete(telegramId);
};

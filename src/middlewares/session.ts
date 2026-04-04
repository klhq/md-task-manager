import { Context, SessionFlavor, session } from 'grammy';
import { AutoChatActionFlavor } from '@grammyjs/auto-chat-action';
import { CalendarOpSession, EditableField } from '../core/types.js';

export type { CalendarOpSession } from '../core/types.js';

// --- EditScene state ---

export interface EditSceneState {
  active: boolean;
  taskIdx: number;
  field?: EditableField;
}

// --- Session types ---

export interface SessionData {
  editScene?: EditSceneState;
  awaitingAdd?: boolean;
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  AutoChatActionFlavor;

// --- grammy session middleware ---

export const sessionMiddleware = session<SessionData, BotContext>({
  initial: () => ({}),
});

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

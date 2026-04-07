import { Metadata, TaskData } from '../core/types.js';

export interface UndoSnapshot {
  taskData: TaskData;
  metadata: Metadata;
}

const undoSnapshots = new Map<number, UndoSnapshot>();

export const saveUndoSnapshot = (userId: number, data: UndoSnapshot): void => {
  undoSnapshots.set(userId, data);
};

export const getUndoSnapshot = (userId: number): UndoSnapshot | undefined => {
  return undoSnapshots.get(userId);
};

export const clearUndoSnapshot = (userId: number): void => {
  undoSnapshots.delete(userId);
};

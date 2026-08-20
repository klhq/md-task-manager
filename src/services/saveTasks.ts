import type { Metadata, TaskData } from '../core/types.js';
import { getStorageProvider } from './storage/factory.js';

export const saveTasks = async (
  tasks: TaskData,
  metadata: Metadata,
): Promise<boolean> => {
  const provider = getStorageProvider();
  return provider.saveTasks(tasks, metadata);
};

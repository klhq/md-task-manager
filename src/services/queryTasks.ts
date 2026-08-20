import type { Metadata, TaskData } from '../core/types.js';
import { getStorageProvider } from './storage/factory.js';

export const queryTasks = async (): Promise<{
  metadata: Metadata;
  taskData: TaskData;
}> => {
  const provider = getStorageProvider();
  return provider.queryTasks();
};

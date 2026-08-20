import type { Metadata, TaskData } from '../../core/types.js';

export interface IStorageProvider {
  queryTasks(): Promise<{ metadata: Metadata; taskData: TaskData }>;
  saveTasks(tasks: TaskData, metadata: Metadata): Promise<boolean>;
  initTasks(): Promise<string | void>;
}

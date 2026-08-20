import { getStorageProvider } from './storage/factory.js';

export async function initTasks(): Promise<string | void> {
  const provider = getStorageProvider();
  return provider.initTasks();
}

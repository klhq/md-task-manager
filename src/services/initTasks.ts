import { getStorageProvider } from './storage/factory.js';

export async function initTasks(): Promise<string | undefined> {
  const provider = getStorageProvider();
  return provider.initTasks();
}

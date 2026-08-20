import { GitHubStorageProvider } from './GitHubStorageProvider.js';
import { NotionStorageProvider } from './NotionStorageProvider.js';
import type { IStorageProvider } from './types.js';

let cachedProvider: IStorageProvider | null = null;

export const getStorageProvider = (): IStorageProvider => {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = (process.env.STORAGE_PROVIDER || 'github').toLowerCase();

  if (providerType === 'notion') {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const accessToken = process.env.NOTION_TOKEN;

    if (!databaseId || !accessToken) {
      throw new Error(
        'Notion storage requires NOTION_DATABASE_ID and NOTION_TOKEN to be set in environment.',
      );
    }

    cachedProvider = new NotionStorageProvider({
      databaseId,
      accessToken,
    });
    return cachedProvider;
  }

  // Default: GitHub
  cachedProvider = new GitHubStorageProvider();
  return cachedProvider;
};

export const resetStorageProvider = () => {
  cachedProvider = null;
};

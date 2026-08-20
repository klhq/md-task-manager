import { afterEach, describe, expect, it } from 'bun:test';
import { getStorageProvider, resetStorageProvider } from './factory.js';
import { GitHubStorageProvider } from './GitHubStorageProvider.js';
import { NotionStorageProvider } from './NotionStorageProvider.js';

describe('OSS Storage Factory', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetStorageProvider();
  });

  it('defaults to GitHubStorageProvider', () => {
    delete process.env.STORAGE_PROVIDER;
    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(GitHubStorageProvider);
  });

  it('returns NotionStorageProvider when STORAGE_PROVIDER=notion and env vars are set', () => {
    process.env.STORAGE_PROVIDER = 'notion';
    process.env.NOTION_DATABASE_ID = 'a1b2c3d4e5f678901234567890abcdef';
    process.env.NOTION_TOKEN = 'ntn_1234567890abcdef';

    const provider = getStorageProvider();
    expect(provider).toBeInstanceOf(NotionStorageProvider);
  });

  it('throws when STORAGE_PROVIDER=notion but env vars are missing', () => {
    process.env.STORAGE_PROVIDER = 'notion';
    delete process.env.NOTION_DATABASE_ID;
    delete process.env.NOTION_TOKEN;

    expect(() => getStorageProvider()).toThrow('Notion storage requires');
  });
});

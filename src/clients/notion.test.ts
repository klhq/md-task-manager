import { describe, expect, it } from 'bun:test';
import {
  isValidDatabaseId,
  isValidNotionToken,
  normalizeDatabaseId,
} from './notion.js';

describe('Notion client helpers (OSS)', () => {
  it('normalizes standard 32-character hex ID', () => {
    const raw = 'a1b2c3d4e5f678901234567890abcdef';
    expect(normalizeDatabaseId(raw)).toBe('a1b2c3d4e5f678901234567890abcdef');
  });

  it('normalizes 36-character UUID with dashes', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
    expect(normalizeDatabaseId(uuid)).toBe('a1b2c3d4e5f678901234567890abcdef');
  });

  it('extracts database ID from full Notion URL', () => {
    const url =
      'https://www.notion.so/myworkspace/My-Tasks-a1b2c3d4e5f678901234567890abcdef?v=123';
    expect(normalizeDatabaseId(url)).toBe('a1b2c3d4e5f678901234567890abcdef');
  });

  it('validates database IDs', () => {
    expect(isValidDatabaseId('a1b2c3d4e5f678901234567890abcdef')).toBe(true);
    expect(isValidDatabaseId('a1b2c3d4-e5f6-7890-1234-567890abcdef')).toBe(
      true,
    );
    expect(isValidDatabaseId('invalid-id')).toBe(false);
  });

  it('validates notion tokens', () => {
    expect(isValidNotionToken('ntn_1234567890abcdef1234567890')).toBe(true);
    expect(isValidNotionToken('secret_1234567890abcdef1234567890')).toBe(true);
    expect(isValidNotionToken('short')).toBe(false);
  });
});

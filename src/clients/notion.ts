import logger from '../core/logger.js';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionRichTextItem {
  type: 'text';
  text: {
    content: string;
    link?: { url: string } | null;
  };
  plain_text?: string;
}

export interface NotionSelectOption {
  id?: string;
  name: string;
  color?: string;
}

export interface NotionDatabasePropertySchema {
  id?: string;
  name?: string;
  type?: string;
  title?: Record<string, never>;
  rich_text?: Record<string, never>;
  checkbox?: Record<string, never>;
  date?: Record<string, never>;
  select?: {
    options?: NotionSelectOption[];
  };
  multi_select?: {
    options?: NotionSelectOption[];
  };
  url?: Record<string, never>;
}

export interface NotionDatabaseResponse {
  id: string;
  title: NotionRichTextItem[];
  properties: Record<string, NotionDatabasePropertySchema>;
  url?: string;
}

export interface NotionPageProperty {
  id: string;
  type: string;
  title?: NotionRichTextItem[];
  rich_text?: NotionRichTextItem[];
  checkbox?: boolean;
  date?: { start: string; end?: string | null } | null;
  select?: NotionSelectOption | null;
  multi_select?: NotionSelectOption[];
  url?: string | null;
}

export interface NotionPageResponse {
  id: string;
  archived: boolean;
  properties: Record<string, NotionPageProperty>;
  url?: string;
}

export interface NotionQueryResponse {
  results: NotionPageResponse[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Normalizes a Notion Database ID or URL to a clean 32-character hexadecimal string without dashes.
 */
export const normalizeDatabaseId = (input: string): string => {
  const trimmed = input.trim();

  // If a URL was provided (e.g. https://www.notion.so/workspace/32hexid?v=...)
  const cleanUrl = trimmed.split('?')[0].split('#')[0];
  const lastSegment = cleanUrl.split('/').filter(Boolean).pop() || '';

  const hex32Match = lastSegment.match(/([0-9a-fA-F]{32})/);
  if (hex32Match) {
    return hex32Match[1].toLowerCase();
  }

  const uuidMatch = trimmed.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
  );
  if (uuidMatch) {
    return uuidMatch[1].replace(/-/g, '').toLowerCase();
  }

  return trimmed.replace(/-/g, '').toLowerCase();
};

export const isValidDatabaseId = (id: string): boolean => {
  const normalized = normalizeDatabaseId(id);
  return /^[0-9a-fA-F]{32}$/.test(normalized);
};

export const isValidNotionToken = (token: string): boolean => {
  const trimmed = token.trim();
  return (
    trimmed.startsWith('ntn_') ||
    trimmed.startsWith('secret_') ||
    trimmed.length >= 30
  );
};

/**
 * Extracts a readable plain text title from a Notion database response object.
 * Falls back to a short database ID descriptor if the title is empty.
 */
export const getNotionDatabaseTitle = (
  db: Pick<NotionDatabaseResponse, 'id' | 'title'>,
): string => {
  const plain =
    db.title?.map((t) => t.plain_text || t.text?.content || '').join('') || '';
  return plain.trim() || `Database ${db.id.replace(/-/g, '').slice(0, 6)}`;
};

const makeNotionRequest = async <T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
): Promise<T> => {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorJson = (await response.json()) as {
        code?: string;
        message?: string;
      };
      errorDetail = errorJson.message
        ? `[${errorJson.code || response.status}] ${errorJson.message}`
        : JSON.stringify(errorJson);
    } catch {
      errorDetail = await response.text();
    }

    logger.errorWithContext({
      op: 'NOTION_API_REQUEST',
      message: `Notion API error (${response.status}): ${errorDetail}`,
    });

    throw new Error(
      `Notion API error (${response.status}): ${errorDetail || response.statusText}`,
    );
  }

  return (await response.json()) as T;
};

/**
 * Sanitizes property schema definitions for Notion API by omitting the top-level 'type',
 * 'id', and 'name' fields which cause Notion API validation errors in POST/PATCH database calls.
 */
export const sanitizePropertySchemasForNotionApi = (
  properties: Record<string, NotionDatabasePropertySchema>,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(properties)) {
    if (!schema) continue;
    const {
      type: _type,
      id: _id,
      name: _name,
      ...rest
    } = schema as Record<string, unknown>;
    sanitized[key] = rest;
  }
  return sanitized;
};

/**
 * Retrieve database information including its properties schema.
 */
export const retrieveDatabase = async (
  databaseId: string,
  token: string,
): Promise<NotionDatabaseResponse> => {
  const normalizedId = normalizeDatabaseId(databaseId);
  return makeNotionRequest<NotionDatabaseResponse>(
    `/databases/${normalizedId}`,
    token,
    {
      method: 'GET',
    },
  );
};

/**
 * Update database schema (add missing properties or update existing ones).
 */
export const updateDatabaseSchema = async (
  databaseId: string,
  properties: Record<string, NotionDatabasePropertySchema>,
  token: string,
): Promise<NotionDatabaseResponse> => {
  const normalizedId = normalizeDatabaseId(databaseId);
  const sanitizedProperties = sanitizePropertySchemasForNotionApi(properties);
  return makeNotionRequest<NotionDatabaseResponse>(
    `/databases/${normalizedId}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ properties: sanitizedProperties }),
    },
  );
};

/**
 * Query database pages (single page of results).
 */
export const queryDatabase = async (
  databaseId: string,
  token: string,
  body: {
    start_cursor?: string;
    page_size?: number;
    filter?: Record<string, unknown>;
    sorts?: unknown[];
  } = {},
): Promise<NotionQueryResponse> => {
  const normalizedId = normalizeDatabaseId(databaseId);
  return makeNotionRequest<NotionQueryResponse>(
    `/databases/${normalizedId}/query`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
};

/**
 * Fetch all pages from a database with automatic pagination handling.
 */
export const fetchAllDatabasePages = async (
  databaseId: string,
  token: string,
): Promise<NotionPageResponse[]> => {
  const allPages: NotionPageResponse[] = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await queryDatabase(databaseId, token, {
      start_cursor: cursor,
      page_size: 100,
    });

    allPages.push(...response.results);

    if (response.has_more && response.next_cursor) {
      cursor = response.next_cursor;
    } else {
      hasMore = false;
    }
  }

  return allPages;
};

/**
 * Create a new page in a database.
 */
export const createPage = async (
  params: {
    databaseId: string;
    properties: Record<string, unknown>;
  },
  token: string,
): Promise<NotionPageResponse> => {
  const normalizedId = normalizeDatabaseId(params.databaseId);
  return makeNotionRequest<NotionPageResponse>('/pages', token, {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: normalizedId },
      properties: params.properties,
    }),
  });
};

/**
 * Update page properties.
 */
export const updatePageProperties = async (
  pageId: string,
  properties: Record<string, unknown>,
  token: string,
): Promise<NotionPageResponse> => {
  return makeNotionRequest<NotionPageResponse>(`/pages/${pageId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      properties,
    }),
  });
};

/**
 * Archive a page (soft delete).
 */
export const archivePage = async (
  pageId: string,
  token: string,
): Promise<NotionPageResponse> => {
  return makeNotionRequest<NotionPageResponse>(`/pages/${pageId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      archived: true,
    }),
  });
};

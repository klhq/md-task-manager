import { lookup } from 'node:dns/promises';

import logger from '../../core/logger.js';

const RETRIES = 3;

interface Config {
  method?: string;
  body?: Record<string, unknown>;
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

export const closeAgent = async () => {
  // Bun handles connection pooling automatically
};

export const tgFetch = async <T>(
  url: string,
  { method = 'GET', body }: Config,
  retries = RETRIES,
): Promise<T | undefined> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Force IPv4 resolution
    const { address: ip } = await lookup(hostname, { family: 4 });
    parsedUrl.hostname = ip;

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : undefined),
        Host: hostname, // Required when using IP in URL
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as TelegramResponse<T>;
    return data.result;
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';

    if (retries > 0 && !isTimeout) {
      logger.warnWithContext({
        message: `Retrying... (${retries} attempts left)`,
      });
      return tgFetch(url, { method, body }, retries - 1);
    }

    logger.errorWithContext({
      message: isTimeout ? 'Request timed out' : 'Error fetching webhook info',
      error: err,
    });
    return;
  } finally {
    clearTimeout(timeoutId);
  }
};

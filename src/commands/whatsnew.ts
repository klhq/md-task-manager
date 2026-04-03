import { LATEST_CHANGELOG } from '../generated/changelog.js';
import { BotContext } from '../middlewares/session.js';
import { logAndReplyError } from '../utils/index.js';

/**
 * Convert markdown changelog to Telegram MarkdownV2 format.
 * Keeps it simple: version header + bullet list of feature names.
 */
const formatChangelog = (raw: string): string => {
  const lines = raw.split('\n');

  // Extract version from first line: "## 1.0.0 (2026-04-02)"
  const versionMatch = /^## (\S+)/.exec(lines[0] ?? '');
  const version = versionMatch?.[1] ?? 'unknown';

  // Extract bullet points, strip commit links
  const items = lines
    .filter((l) => l.startsWith('* '))
    .map((l) =>
      l.replace(/\s*\(\[[\da-f]+\]\([^)]+\)\)/g, '').replace(/^\* /, ''),
    )
    .slice(0, 15); // Cap at 15 items

  const escaped = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

  const header = `🆕 *What's New — v${escaped(version)}*`;
  const body = items.map((item) => `• ${escaped(item)}`).join('\n');

  return `${header}\n\n${body}`;
};

export const whatsnewCommand = async (ctx: BotContext) => {
  try {
    const message = formatChangelog(LATEST_CHANGELOG);
    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    logAndReplyError(ctx, 'WHATSNEW', error, '❌ Error showing changelog.');
  }
};

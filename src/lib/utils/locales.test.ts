import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AVAILABLE_LANGUAGES } from './i18n';

/**
 * The locale files are plain JSON: not type-checked, not covered by lint, and a
 * key that is missing there only shows up as English (or a raw key) in front of
 * a user. This test is the safety net — it fails when a new `en` key has not
 * been carried into every other locale, or when a translation drops one of the
 * `$PLACEHOLDER$` / `$1` tokens the calling code substitutes into it.
 */

interface MessageEntry {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string }>;
}

const localesDir = resolve(__dirname, '../../_locales');

function readLocale(code: string): Record<string, MessageEntry> {
  return JSON.parse(readFileSync(resolve(localesDir, code, 'messages.json'), 'utf8'));
}

/** Every `$NAME$` and `$1` token in a message, sorted so order changes are allowed. */
function tokens(message: string): string[] {
  return [...message.matchAll(/\$[A-Za-z0-9_]+\$|\$\d/g)].map((match) => match[0]).sort();
}

const english = readLocale('en');
const englishKeys = Object.keys(english);
const localeCodes = readdirSync(localesDir).filter((code) => code !== 'en');

describe('locales', () => {
  it('offers every shipped locale in the language picker', () => {
    const offered = AVAILABLE_LANGUAGES.map((lang) => lang.code).sort();
    expect(offered).toEqual(['en', ...localeCodes].sort());
  });

  it.each(localeCodes)('%s has exactly the English keys', (code) => {
    const messages = readLocale(code);
    expect(englishKeys.filter((key) => !(key in messages))).toEqual([]);
    expect(Object.keys(messages).filter((key) => !(key in english))).toEqual([]);
  });

  it.each(localeCodes)('%s keeps every placeholder and translates every message', (code) => {
    const messages = readLocale(code);
    for (const key of englishKeys) {
      const entry = messages[key];
      if (!entry) continue;
      expect(entry.message.trim(), `${code}/${key} is empty`).not.toBe('');
      expect(tokens(entry.message), `${code}/${key} placeholders`).toEqual(
        tokens(english[key].message)
      );
      expect(entry.placeholders, `${code}/${key} placeholder definitions`).toEqual(
        english[key].placeholders
      );
    }
  });
});

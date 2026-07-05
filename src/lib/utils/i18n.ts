/**
 * Translation utility for browser extension i18n
 * Works with both Chrome (chrome.i18n) and Firefox (browser.i18n)
 *
 * Supports an optional user-selected language override that takes precedence
 * over the browser UI locale. When set, the corresponding `_locales/<lang>/
 * messages.json` is loaded into memory and consulted by `t()` before falling
 * back to the native `browser.i18n.getMessage()` (which uses the browser locale).
 */

interface MessageEntry {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string }>;
}

type MessageMap = Record<string, MessageEntry>;

interface BrowserGlobals {
  i18n?: {
    getMessage(key: string, substitutions?: string | string[]): string;
    getUILanguage(): string;
  };
  storage?: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
    };
  };
  runtime?: {
    getURL(path: string): string;
  };
}

export const AVAILABLE_LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'hu', name: 'Magyar' },
  { code: 'pl', name: 'Polski' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'uk', name: 'Українська' },
];

let overrideMessages: MessageMap | null = null;
let overrideLanguage: string | null = null;

/** Seed translations directly — used by the demo/dev page where browser.i18n is unavailable. */
export function seedMessages(messages: Record<string, unknown>, language = 'en'): void {
  overrideMessages = messages as MessageMap;
  overrideLanguage = language;
}

function getBrowserAPI(): BrowserGlobals | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as unknown as { browser?: BrowserGlobals; chrome?: BrowserGlobals };
  return g.browser ?? g.chrome ?? null;
}

function applySubstitutions(entry: MessageEntry, substitutions?: string | string[]): string {
  const args = Array.isArray(substitutions)
    ? substitutions
    : substitutions != null
      ? [substitutions]
      : [];

  let result = entry.message;

  if (entry.placeholders) {
    for (const [name, def] of Object.entries(entry.placeholders)) {
      const resolved = def.content.replace(/\$(\d+)/g, (_m, idx) => args[Number(idx) - 1] ?? '');
      result = result.replace(new RegExp(`\\$${name}\\$`, 'gi'), resolved);
    }
  }

  result = result.replace(/\$(\d+)/g, (_m, idx) => args[Number(idx) - 1] ?? '');
  return result;
}

/**
 * Load the user's preferred language (if any) and cache its messages.json so
 * subsequent `t()` calls return localized strings from it. Safe to call early
 * during page bootstrap; failures fall back silently to the browser locale.
 */
export async function initI18n(): Promise<void> {
  try {
    const api = getBrowserAPI();
    if (!api?.storage?.local || !api?.runtime?.getURL) return;

    const stored = await api.storage.local.get('displayPreferences');
    const prefs = stored.displayPreferences as { preferredLanguage?: string } | undefined;
    const lang = prefs?.preferredLanguage;
    if (!lang) return;

    const url = api.runtime.getURL(`_locales/${lang}/messages.json`);
    const res = await fetch(url);
    if (!res.ok) return;

    overrideMessages = (await res.json()) as MessageMap;
    overrideLanguage = lang;
  } catch (error) {
    console.warn('i18n override init failed, using browser locale:', error);
  }
}

/**
 * Get a translated message by key
 */
export function t(key: string, substitutions?: string | string[]): string {
  if (overrideMessages) {
    const entry = overrideMessages[key];
    if (entry?.message) return applySubstitutions(entry, substitutions);
  }

  const api = getBrowserAPI();
  if (!api?.i18n) {
    return key;
  }

  try {
    const message = api.i18n.getMessage(key, substitutions);
    if (!message) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return message;
  } catch (error) {
    console.error(`Error getting translation for key ${key}:`, error);
    return key;
  }
}

/**
 * Currently active language: user override if set, otherwise browser UI language.
 */
export function getCurrentLanguage(): string {
  if (overrideLanguage) return overrideLanguage;
  const api = getBrowserAPI();
  if (!api?.i18n) return 'en';
  try {
    return api.i18n.getUILanguage();
  } catch (error) {
    console.error('Error getting UI language:', error);
    return 'en';
  }
}

/**
 * Get the UI language of the browser (ignores user override).
 */
export function getUILanguage(): string {
  const api = getBrowserAPI();
  if (!api?.i18n) return 'en';
  try {
    return api.i18n.getUILanguage();
  } catch (error) {
    console.error('Error getting UI language:', error);
    return 'en';
  }
}

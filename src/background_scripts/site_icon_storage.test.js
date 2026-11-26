import { describe, expect, it, vi } from 'vitest';
import {
  MAX_DATA_URL_LENGTH,
  SITE_ICONS_KEY,
  isRecordableIconUrl,
  needsIconRecording,
  pruneSiteIcons,
  recordSiteIcon,
} from './site_icon_storage.js';

/** Minimal in-memory stand-in for browser.storage.local. */
function installFakeStorage(initial = {}, baseUrl = 'moz-extension://abc/') {
  const store = { ...initial };
  globalThis.browser = {
    runtime: { getURL: (path) => baseUrl + path },
    storage: {
      local: {
        get: vi.fn(async (key) => ({ [key]: store[key] })),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
      },
    },
  };
  return store;
}

describe('isRecordableIconUrl', () => {
  it('keeps remote icons and small inline ones', () => {
    expect(isRecordableIconUrl('https://www.instagram.com/favicon.ico')).toBe(true);
    expect(isRecordableIconUrl('data:image/png;base64,AAAA')).toBe(true);
  });

  it('refuses browser-internal, oversized and missing icons', () => {
    expect(isRecordableIconUrl('chrome://branding/content/icon32.png')).toBe(false);
    expect(isRecordableIconUrl('moz-extension://abc/icon.png')).toBe(false);
    expect(isRecordableIconUrl('data:image/png;base64,' + 'A'.repeat(MAX_DATA_URL_LENGTH))).toBe(false);
    expect(isRecordableIconUrl(undefined)).toBe(false);
    expect(isRecordableIconUrl('')).toBe(false);
  });
});

describe('needsIconRecording', () => {
  it('is on in Firefox and off in Chromium, which has its own cache', () => {
    installFakeStorage({}, 'moz-extension://abc/');
    expect(needsIconRecording()).toBe(true);
    installFakeStorage({}, 'chrome-extension://abc/');
    expect(needsIconRecording()).toBe(false);
  });
});

describe('recordSiteIcon', () => {
  it('stores the icon under the rule host, not the visited page', async () => {
    const store = installFakeStorage();
    await recordSiteIcon('youtube.com/shorts', 'https://www.youtube.com/s/favicon.ico');
    expect(store[SITE_ICONS_KEY]).toEqual({
      'youtube.com': 'https://www.youtube.com/s/favicon.ico',
    });
  });

  it('does not write when the icon is unchanged', async () => {
    const store = installFakeStorage({
      [SITE_ICONS_KEY]: { 'reddit.com': 'https://reddit.com/favicon.ico' },
    });
    expect(await recordSiteIcon('reddit.com', 'https://reddit.com/favicon.ico')).toBe(false);
    expect(browser.storage.local.set).not.toHaveBeenCalled();
    expect(store[SITE_ICONS_KEY]['reddit.com']).toBe('https://reddit.com/favicon.ico');
  });

  it('keeps other hosts when one changes', async () => {
    const store = installFakeStorage({
      [SITE_ICONS_KEY]: { 'reddit.com': 'https://reddit.com/a.ico' },
    });
    await recordSiteIcon('facebook.com', 'https://facebook.com/b.ico');
    expect(store[SITE_ICONS_KEY]).toEqual({
      'reddit.com': 'https://reddit.com/a.ico',
      'facebook.com': 'https://facebook.com/b.ico',
    });
  });

  it('ignores icons it should not keep', async () => {
    installFakeStorage();
    expect(await recordSiteIcon('reddit.com', 'chrome://global/skin/icon.svg')).toBe(false);
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  });
});

describe('pruneSiteIcons', () => {
  it('drops hosts that no rule uses any more', async () => {
    const store = installFakeStorage({
      [SITE_ICONS_KEY]: {
        'reddit.com': 'https://reddit.com/a.ico',
        'youtube.com': 'https://youtube.com/b.ico',
      },
    });
    const removed = await pruneSiteIcons([{ urlPattern: 'youtube.com/shorts' }]);
    expect(removed).toBe(1);
    expect(store[SITE_ICONS_KEY]).toEqual({ 'youtube.com': 'https://youtube.com/b.ico' });
  });

  it('does not write when nothing is stale', async () => {
    installFakeStorage({ [SITE_ICONS_KEY]: { 'reddit.com': 'x' } });
    expect(await pruneSiteIcons([{ urlPattern: 'reddit.com' }])).toBe(0);
    expect(browser.storage.local.set).not.toHaveBeenCalled();
  });
});

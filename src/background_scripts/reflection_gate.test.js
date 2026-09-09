import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildReflectionUrl,
  checkReflectionRequired,
  isReflectionPage,
  resolveReflectionDelay,
} from './reflection_gate.js';
import { grantReflectionPass } from './reflection_storage.js';

/** Minimal in-memory stand-in for browser.storage.local plus runtime.getURL. */
function installFakeBrowser(sites = [], groups = []) {
  const store = { distractingSites: sites, groups };
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key) => ({ [key]: store[key] })),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
      },
    },
    runtime: {
      getURL: (path) => `moz-extension://abc/${path}`,
    },
  };
  return store;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('resolveReflectionDelay', () => {
  const site = {
    id: 'site-1',
    urlPattern: 'youtube.com',
    reflectionDelaySeconds: 10,
  };

  it('finds the delay on a standalone site', () => {
    const match = resolveReflectionDelay('https://youtube.com/watch', [site], []);
    expect(match).toMatchObject({ siteId: 'site-1', limitId: 'site-1', delaySeconds: 10 });
  });

  it('ignores sites without a delay', () => {
    expect(
      resolveReflectionDelay('https://youtube.com', [{ id: 'x', urlPattern: 'youtube.com' }], [])
    ).toBeNull();
  });

  it('ignores disabled sites', () => {
    expect(
      resolveReflectionDelay('https://youtube.com', [{ ...site, isEnabled: false }], [])
    ).toBeNull();
  });

  it("prefers the group's delay and shares one pass across the group", () => {
    const grouped = { ...site, groupId: 'group-1' };
    const groups = [{ id: 'group-1', name: 'Social', reflectionDelaySeconds: 15 }];
    expect(resolveReflectionDelay('https://youtube.com', [grouped], groups)).toMatchObject({
      siteId: 'site-1',
      limitId: 'group-1',
      groupId: 'group-1',
      delaySeconds: 15,
    });
  });

  it("keeps the site's own delay when its group sets none", () => {
    const grouped = { ...site, groupId: 'group-1' };
    const groups = [{ id: 'group-1', name: 'Social', dailyLimitSeconds: 600 }];
    expect(resolveReflectionDelay('https://youtube.com', [grouped], groups)).toMatchObject({
      limitId: 'group-1',
      delaySeconds: 10,
    });
  });

  it('falls back to the site when its group is disabled', () => {
    const grouped = { ...site, groupId: 'group-1' };
    const groups = [
      { id: 'group-1', reflectionDelaySeconds: 15, isEnabled: false },
    ];
    expect(resolveReflectionDelay('https://youtube.com', [grouped], groups)).toMatchObject({
      limitId: 'site-1',
      delaySeconds: 10,
    });
  });

  it('uses the most specific pattern, like every other limit', () => {
    const sites = [
      { id: 'domain', urlPattern: 'youtube.com', reflectionDelaySeconds: 5 },
      { id: 'section', urlPattern: 'youtube.com/shorts', reflectionDelaySeconds: 15 },
    ];
    expect(
      resolveReflectionDelay('https://youtube.com/shorts/abc', sites, [])
    ).toMatchObject({ siteId: 'section', delaySeconds: 15 });
  });
});

describe('checkReflectionRequired', () => {
  const site = {
    id: 'site-1',
    urlPattern: 'youtube.com',
    reflectionDelaySeconds: 10,
  };

  it('asks for a pause on a matching URL', async () => {
    installFakeBrowser([site]);
    const result = await checkReflectionRequired('https://youtube.com/watch?v=1');
    expect(result.required).toBe(true);
    expect(result.delaySeconds).toBe(10);
  });

  it('stays out of the way after a recent "yes"', async () => {
    installFakeBrowser([site]);
    await grantReflectionPass('site-1');
    expect((await checkReflectionRequired('https://youtube.com')).required).toBe(false);
  });

  it('asks again once the pass has expired', async () => {
    installFakeBrowser([site]);
    await grantReflectionPass('site-1', -1000);
    expect((await checkReflectionRequired('https://youtube.com')).required).toBe(true);
  });

  it('ignores non-http URLs', async () => {
    installFakeBrowser([site]);
    expect(
      (await checkReflectionRequired('moz-extension://abc/pages/reflect/index.html'))
        .required
    ).toBe(false);
  });
});

describe('buildReflectionUrl', () => {
  it('carries the original URL through verbatim', () => {
    installFakeBrowser();
    const original = 'https://youtube.com/watch?v=abc&t=90#comments';
    const url = buildReflectionUrl(original, { siteId: 'site-1', delaySeconds: 10 });

    expect(isReflectionPage(url)).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('url')).toBe(original);
    expect(params.get('siteId')).toBe('site-1');
    expect(params.get('seconds')).toBe('10');
  });
});

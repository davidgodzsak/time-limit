import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDistractingSite,
  findSiteByPattern,
  getDistractingSites,
  updateDistractingSite,
} from './site_storage.js';

/** Minimal in-memory stand-in for browser.storage.local. */
function installFakeStorage(initialSites = []) {
  const store = { distractingSites: initialSites };
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key) => ({ [key]: store[key] })),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
      },
    },
  };
  return store;
}

beforeEach(() => {
  let counter = 0;
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++counter}` });
});

describe('addDistractingSite', () => {
  it('stores the normalized pattern', async () => {
    installFakeStorage();
    const site = await addDistractingSite({
      urlPattern: 'HTTPS://www.YouTube.com/Shorts/',
      dailyLimitSeconds: 600,
    });
    expect(site.urlPattern).toBe('youtube.com/shorts');
  });

  it('refuses a second site with the same pattern', async () => {
    const store = installFakeStorage();
    await addDistractingSite({ urlPattern: 'facebook.com', dailyLimitSeconds: 600 });
    const duplicate = await addDistractingSite({
      urlPattern: 'www.facebook.com/',
      dailyLimitSeconds: 900,
    });

    expect(duplicate).toBeNull();
    expect(store.distractingSites).toHaveLength(1);
  });

  it('refuses a page already limited inside a group', async () => {
    installFakeStorage([
      { id: 'g1', urlPattern: 'instagram.com', groupId: 'group-1' },
    ]);
    const result = await addDistractingSite({
      urlPattern: 'instagram.com',
      dailyLimitSeconds: 600,
    });
    expect(result).toBeNull();
  });

  it('allows a narrower pattern alongside the domain', async () => {
    installFakeStorage([{ id: '1', urlPattern: 'youtube.com' }]);
    const site = await addDistractingSite({
      urlPattern: 'youtube.com/shorts',
      dailyLimitSeconds: 600,
    });
    expect(site).not.toBeNull();
    expect(await getDistractingSites()).toHaveLength(2);
  });

  it('accepts a site limited only by a reflection delay', async () => {
    installFakeStorage();
    const site = await addDistractingSite({
      urlPattern: 'youtube.com',
      reflectionDelaySeconds: 10,
    });
    expect(site).not.toBeNull();
    expect(site.reflectionDelaySeconds).toBe(10);
    expect(site.dailyLimitSeconds).toBeUndefined();
  });

  it('rejects patterns that are not usable', async () => {
    installFakeStorage();
    expect(
      await addDistractingSite({ urlPattern: 'not a host', dailyLimitSeconds: 600 })
    ).toBeNull();
  });
});

describe('updateDistractingSite', () => {
  it('normalizes a renamed pattern', async () => {
    installFakeStorage([
      { id: '1', urlPattern: 'facebook.com', dailyLimitSeconds: 600 },
    ]);
    const updated = await updateDistractingSite('1', {
      urlPattern: 'https://www.Instagram.com/Reels',
    });
    expect(updated.urlPattern).toBe('instagram.com/reels');
  });

  it('refuses a rename onto another site pattern', async () => {
    installFakeStorage([
      { id: '1', urlPattern: 'facebook.com', dailyLimitSeconds: 600 },
      { id: '2', urlPattern: 'instagram.com', dailyLimitSeconds: 600 },
    ]);
    expect(
      await updateDistractingSite('1', { urlPattern: 'instagram.com' })
    ).toBeNull();
  });

  it('clears a time limit when a site keeps its opens limit', async () => {
    installFakeStorage([
      { id: '1', urlPattern: 'facebook.com', dailyLimitSeconds: 600, dailyOpenLimit: 5 },
    ]);
    const updated = await updateDistractingSite('1', { dailyLimitSeconds: null });
    expect(updated).not.toBeNull();
    expect(updated.dailyLimitSeconds).toBeUndefined();
    expect(updated.dailyOpenLimit).toBe(5);
  });

  it('refuses to strip the last limit from a standalone site', async () => {
    installFakeStorage([
      { id: '1', urlPattern: 'facebook.com', dailyLimitSeconds: 600 },
    ]);
    expect(
      await updateDistractingSite('1', { dailyLimitSeconds: null })
    ).toBeNull();
  });

  it('lets a reflection delay stand in for the last hard limit', async () => {
    installFakeStorage([
      {
        id: '1',
        urlPattern: 'facebook.com',
        dailyLimitSeconds: 600,
        reflectionDelaySeconds: 10,
      },
    ]);
    const updated = await updateDistractingSite('1', { dailyLimitSeconds: null });
    expect(updated).not.toBeNull();
    expect(updated.dailyLimitSeconds).toBeUndefined();
    expect(updated.reflectionDelaySeconds).toBe(10);
  });

  it('clears the reflection delay when asked', async () => {
    installFakeStorage([
      {
        id: '1',
        urlPattern: 'facebook.com',
        dailyOpenLimit: 5,
        reflectionDelaySeconds: 10,
      },
    ]);
    const updated = await updateDistractingSite('1', {
      reflectionDelaySeconds: null,
    });
    expect(updated.reflectionDelaySeconds).toBeUndefined();
    expect(updated.dailyOpenLimit).toBe(5);
  });

  it('allows a grouped site to hold no limits of its own', async () => {
    installFakeStorage([
      { id: '1', urlPattern: 'facebook.com', dailyOpenLimit: 5, groupId: 'group-1' },
    ]);
    const updated = await updateDistractingSite('1', { dailyOpenLimit: null });
    expect(updated).not.toBeNull();
    expect(updated.dailyOpenLimit).toBeUndefined();
  });
});

describe('findSiteByPattern', () => {
  it('finds the clashing rule regardless of how it was typed', async () => {
    installFakeStorage([{ id: '1', urlPattern: 'facebook.com' }]);
    expect((await findSiteByPattern('https://www.facebook.com')).id).toBe('1');
    expect(await findSiteByPattern('facebook.com', '1')).toBeNull();
    expect(await findSiteByPattern('twitter.com')).toBeNull();
  });
});

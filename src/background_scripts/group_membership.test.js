import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDistractingSite,
  detachSiteFromGroup,
  detachSitesFromGroup,
  findSiteByPattern,
  getDistractingSites,
  repairOrphanedGroupMembers,
  siteHasOwnRule,
} from './site_storage.js';

/**
 * Taking a site out of a group used to strand it: `groupId` stayed pointing at
 * a group the site was no longer in, which hides it from both Settings tabs
 * (the individual list filters on `!groupId`, the group no longer lists it)
 * while it still holds its URL pattern against every future add. These tests
 * pin down the two ways that happened and the repair for installs carrying it.
 */

/** Minimal in-memory stand-in for browser.storage.local. */
function installFakeStorage(initial = {}) {
  const store = { distractingSites: [], ...initial };
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

/** A member added the way the "Add site to group" dialog adds one: no limits. */
function member(id, urlPattern, groupId, extra = {}) {
  return { id, urlPattern, groupId, isEnabled: true, ...extra };
}

describe('siteHasOwnRule', () => {
  it('counts each kind of rule, and nothing else', () => {
    expect(siteHasOwnRule({ dailyLimitSeconds: 600 })).toBe(true);
    expect(siteHasOwnRule({ dailyOpenLimit: 5 })).toBe(true);
    expect(siteHasOwnRule({ reflectionDelaySeconds: 10 })).toBe(true);
    expect(siteHasOwnRule({ isBlocked: true })).toBe(true);
    expect(siteHasOwnRule({ isEnabled: true, groupId: 'g1' })).toBe(false);
    expect(siteHasOwnRule(null)).toBe(false);
  });
});

describe('detachSiteFromGroup', () => {
  it('deletes a member that only existed inside the group', async () => {
    const store = installFakeStorage({
      distractingSites: [member('s1', 'instagram.com', 'g1')],
    });

    const result = await detachSiteFromGroup('s1');

    expect(result.outcome).toBe('deleted');
    expect(store.distractingSites).toEqual([]);
    // The whole point: the pattern is free again.
    expect(await findSiteByPattern('instagram.com')).toBeNull();
  });

  it('keeps a member that has limits of its own, as a standalone site', async () => {
    const store = installFakeStorage({
      distractingSites: [member('s1', 'reddit.com', 'g1', { dailyLimitSeconds: 600 })],
    });

    const result = await detachSiteFromGroup('s1');

    expect(result.outcome).toBe('standalone');
    expect(store.distractingSites[0].groupId).toBeUndefined();
    expect(store.distractingSites[0].dailyLimitSeconds).toBe(600);
  });
});

describe('detachSitesFromGroup', () => {
  it('dissolves a whole group, keeping only the members worth keeping', async () => {
    const store = installFakeStorage({
      distractingSites: [
        member('s1', 'instagram.com', 'g1'),
        member('s2', 'reddit.com', 'g1', { dailyOpenLimit: 3 }),
        member('s3', 'youtube.com', 'g2'),
      ],
    });

    const result = await detachSitesFromGroup('g1');

    expect(result.deletedSiteIds).toEqual(['s1']);
    expect(result.standalone.map((s) => s.id)).toEqual(['s2']);
    // Another group's member is untouched.
    expect(store.distractingSites.find((s) => s.id === 's3').groupId).toBe('g2');
  });
});

describe('repairOrphanedGroupMembers', () => {
  it('frees a site left pointing at a group that no longer exists', async () => {
    installFakeStorage({
      distractingSites: [member('s1', 'instagram.com', 'gone')],
    });

    const repaired = await repairOrphanedGroupMembers([]);

    expect(repaired.deletedSiteIds).toEqual(['s1']);
    expect(await findSiteByPattern('instagram.com')).toBeNull();
    // And the page can be limited again, which is what the user could not do.
    const readded = await addDistractingSite({
      urlPattern: 'instagram.com',
      dailyLimitSeconds: 600,
    });
    expect(readded).not.toBeNull();
  });

  it('frees a site whose group exists but does not list it', async () => {
    installFakeStorage({
      distractingSites: [member('s1', 'instagram.com', 'g1')],
    });

    const repaired = await repairOrphanedGroupMembers([
      { id: 'g1', name: 'Social', siteIds: [] },
    ]);

    expect(repaired.deletedSiteIds).toEqual(['s1']);
  });

  it('leaves a properly filed member alone', async () => {
    const store = installFakeStorage({
      distractingSites: [member('s1', 'instagram.com', 'g1')],
    });

    const repaired = await repairOrphanedGroupMembers([
      { id: 'g1', name: 'Social', siteIds: ['s1'] },
    ]);

    expect(repaired).toEqual({ standalone: [], deletedSiteIds: [] });
    expect(store.distractingSites).toHaveLength(1);
  });

  it('leaves standalone sites alone', async () => {
    const store = installFakeStorage({
      distractingSites: [{ id: 's1', urlPattern: 'x.com', dailyLimitSeconds: 60, isEnabled: true }],
    });

    await repairOrphanedGroupMembers([]);

    expect(store.distractingSites).toHaveLength(1);
  });
});

describe('the bug that started this', () => {
  it('lets a page be re-limited after its group is dissolved', async () => {
    installFakeStorage({
      distractingSites: [member('s1', 'instagram.com', 'g1')],
    });

    // Before the fix this left s1 in storage with groupId "g1", so the pattern
    // stayed taken and Settings showed the site nowhere.
    await detachSitesFromGroup('g1');

    expect(await getDistractingSites()).toEqual([]);
    const readded = await addDistractingSite({
      urlPattern: 'instagram.com',
      dailyLimitSeconds: 900,
    });
    expect(readded.urlPattern).toBe('instagram.com');
  });
});

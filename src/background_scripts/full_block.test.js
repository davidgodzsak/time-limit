/**
 * The full block, end to end through the modules that decide what a navigation
 * does: the blocker (does the tab go to the timeout page?) and the gate (does
 * it get a countdown first?).
 *
 * The rules encoded here are the product decisions written down in
 * site_blocker.js:
 *  - a block outranks time, opens and the countdown, whatever the usage;
 *  - a blocked group blocks every member, and a member keeps its own block
 *    inside a group that has none;
 *  - turning the site or the group off lifts the block like any other rule;
 *  - the most specific pattern still wins, so a blocked domain can carry an
 *    exception for one section.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndBlockSite, resolveFullBlock } from './site_blocker.js';
import { checkReflectionRequired } from './reflection_gate.js';
import { addDistractingSite, updateDistractingSite } from './site_storage.js';
import { addGroup, updateGroup } from './group_storage.js';

const TODAY = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
})();

const SITES = [
  // Blocked outright, and it also still carries a pause that must never run.
  {
    id: 'blocked-site',
    urlPattern: 'reddit.com',
    isBlocked: true,
    reflectionDelaySeconds: 10,
  },
  // An exception one level down: the domain is blocked, this section is not.
  { id: 'allowed-section', urlPattern: 'reddit.com/r/rust', dailyLimitSeconds: 600 },
  // Blocked by its group.
  { id: 'in-blocked-group', urlPattern: 'instagram.com', groupId: 'social' },
  // Its own block, inside a group that only limits time.
  {
    id: 'blocked-in-open-group',
    urlPattern: 'tiktok.com',
    groupId: 'fun',
    isBlocked: true,
  },
  // Ordinary member of the unblocked group.
  { id: 'plain-member', urlPattern: 'twitch.tv', groupId: 'fun' },
  // Blocked, but the rule itself is switched off.
  {
    id: 'disabled-block',
    urlPattern: 'facebook.com',
    isBlocked: true,
    isEnabled: false,
  },
];

const GROUPS = [
  { id: 'social', name: 'Social', isBlocked: true, isEnabled: true },
  { id: 'fun', name: 'Fun', dailyLimitSeconds: 3600, isEnabled: true },
];

function installStorage({ sites = SITES, groups = GROUPS, usage = {} } = {}) {
  const store = {
    distractingSites: sites,
    groups,
    [`usageStats-${TODAY}`]: usage,
    [`extensions-${TODAY}`]: {},
  };
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (keys) => {
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, store[key]]));
          }
          return { [keys]: store[keys] };
        }),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
      },
      onChanged: { addListener: vi.fn() },
    },
    runtime: { getURL: (path) => `moz-extension://abc/${path}` },
  };
  return store;
}

beforeEach(() => {
  installStorage();
  vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' });
});

describe('resolveFullBlock', () => {
  it('reads a block off the site', () => {
    expect(resolveFullBlock({ isBlocked: true }, null)).toEqual({
      isBlocked: true,
      byGroup: false,
      groupName: null,
    });
  });

  it('reads a block off the group and names it', () => {
    expect(
      resolveFullBlock({}, { name: 'Social', isBlocked: true, isEnabled: true })
    ).toEqual({ isBlocked: true, byGroup: true, groupName: 'Social' });
  });

  it('keeps the site block when the group has none', () => {
    const group = { name: 'Fun', dailyLimitSeconds: 60, isEnabled: true };
    expect(resolveFullBlock({ isBlocked: true }, group).isBlocked).toBe(true);
  });

  it('lifts a group block while the group is switched off', () => {
    const group = { name: 'Social', isBlocked: true, isEnabled: false };
    expect(resolveFullBlock({}, group).isBlocked).toBe(false);
  });

  it('says no when nothing sets a block', () => {
    expect(resolveFullBlock({ dailyLimitSeconds: 60 }, null).isBlocked).toBe(false);
  });
});

describe('a blocked site', () => {
  it('is blocked with no usage at all', async () => {
    const block = await checkAndBlockSite(1, 'https://reddit.com/');
    expect(block).toMatchObject({
      shouldBlock: true,
      siteId: 'blocked-site',
      limitType: 'blocked',
    });
  });

  it('is blocked even with an extension granted today', async () => {
    const store = installStorage();
    store[`extensions-${TODAY}`] = {
      'blocked-site': { extendedMinutes: 60, extendedOpens: 10 },
    };
    expect((await checkAndBlockSite(1, 'https://reddit.com/')).shouldBlock).toBe(true);
  });

  it('never gets the countdown, because the blocker answers first', async () => {
    const block = await checkAndBlockSite(1, 'https://reddit.com/');
    expect(block.shouldBlock).toBe(true);
    // The gate would happily pause this URL; handleBeforeNavigate never asks it
    // once the blocker has redirected the tab.
    expect((await checkReflectionRequired('https://reddit.com/')).required).toBe(true);
  });

  it('leaves a more specific section rule in charge', async () => {
    const block = await checkAndBlockSite(1, 'https://reddit.com/r/rust/comments/1');
    expect(block.shouldBlock).toBe(false);
    expect(block.siteId).toBe('allowed-section');
  });

  it('is not blocked while the rule is switched off', async () => {
    const block = await checkAndBlockSite(1, 'https://facebook.com/feed');
    expect(block.shouldBlock).toBe(false);
  });
});

describe('a blocked group', () => {
  it('blocks its members and says which group did it', async () => {
    const block = await checkAndBlockSite(1, 'https://instagram.com/explore');
    expect(block).toMatchObject({ shouldBlock: true, limitType: 'blocked' });
    expect(block.reason).toContain('Social');
  });

  it('stops blocking when the group is switched off', async () => {
    installStorage({
      groups: [{ ...GROUPS[0], isEnabled: false }, GROUPS[1]],
    });
    expect((await checkAndBlockSite(1, 'https://instagram.com/')).shouldBlock).toBe(
      false
    );
  });
});

describe('a blocked site inside an unblocked group', () => {
  it('stays blocked — a group never silently unblocks a member', async () => {
    const block = await checkAndBlockSite(1, 'https://tiktok.com/foryou');
    expect(block).toMatchObject({
      shouldBlock: true,
      siteId: 'blocked-in-open-group',
      limitType: 'blocked',
    });
  });

  it('does not spread to the other members', async () => {
    expect((await checkAndBlockSite(1, 'https://twitch.tv/')).shouldBlock).toBe(false);
  });
});

describe('storage counts a block as a rule of its own', () => {
  it('accepts a site with nothing but a block', async () => {
    installStorage({ sites: [] });
    const site = await addDistractingSite({
      urlPattern: 'x.com',
      isBlocked: true,
    });
    expect(site).toMatchObject({ urlPattern: 'x.com', isBlocked: true });
  });

  it('accepts a group with nothing but a block', async () => {
    installStorage({ sites: [], groups: [] });
    const group = await addGroup({ name: 'Blocked', isBlocked: true });
    expect(group).toMatchObject({ name: 'Blocked', isBlocked: true });
  });

  it('lets a block be the last rule left on a site', async () => {
    installStorage({
      sites: [
        { id: 's1', urlPattern: 'x.com', dailyLimitSeconds: 600, isBlocked: true },
      ],
      groups: [],
    });
    const updated = await updateDistractingSite('s1', { dailyLimitSeconds: null });
    expect(updated).toMatchObject({ isBlocked: true });
    expect(updated.dailyLimitSeconds).toBeUndefined();
  });

  it('refuses to leave a site with no rule at all', async () => {
    installStorage({
      sites: [{ id: 's1', urlPattern: 'x.com', isBlocked: true }],
      groups: [],
    });
    expect(
      await updateDistractingSite('s1', { isBlocked: false })
    ).toBeNull();
  });

  it('removes the flag rather than storing a false one', async () => {
    installStorage({
      sites: [
        { id: 's1', urlPattern: 'x.com', dailyLimitSeconds: 600, isBlocked: true },
      ],
      groups: [],
    });
    const updated = await updateDistractingSite('s1', { isBlocked: false });
    expect('isBlocked' in updated).toBe(false);
  });

  it('does the same for a group', async () => {
    installStorage({
      sites: [],
      groups: [{ id: 'g1', name: 'G', dailyOpenLimit: 5, isBlocked: true, siteIds: [] }],
    });
    const updated = await updateGroup('g1', { isBlocked: false });
    expect('isBlocked' in updated).toBe(false);
    expect(await updateGroup('g1', { dailyOpenLimit: null })).toBeNull();
  });
});

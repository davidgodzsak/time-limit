/**
 * End-to-end check of the reflection delay against the hard limits, through the
 * two modules that decide what happens on a navigation: the blocker (does the
 * tab go to the timeout page?) and the gate (does it get a countdown first?).
 *
 * The order these encode is the product decision written down in
 * reflection_gate.js: a used-up limit wins, the countdown only guards sites the
 * user may still open.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAndBlockSite } from './site_blocker.js';
import { checkReflectionRequired } from './reflection_gate.js';
import { grantReflectionPass } from './reflection_storage.js';

const TODAY = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
})();

const SITES = [
  // Nothing but a pause: openable all day, but never without a moment's thought.
  { id: 'pause-only', urlPattern: 'news.ycombinator.com', reflectionDelaySeconds: 10 },
  // Both kinds of rule on one site.
  {
    id: 'both',
    urlPattern: 'youtube.com',
    dailyLimitSeconds: 600,
    reflectionDelaySeconds: 5,
  },
  // Delay inherited from the group.
  { id: 'grouped', urlPattern: 'instagram.com', groupId: 'social' },
];

const GROUPS = [
  { id: 'social', name: 'Social', dailyOpenLimit: 5, reflectionDelaySeconds: 15, isEnabled: true },
];

function installStorage(usage = {}) {
  const store = {
    distractingSites: SITES,
    groups: GROUPS,
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
});

describe('a site limited only by a pause', () => {
  it('is never blocked, however long it is used', async () => {
    installStorage({ 'pause-only': { timeSpentSeconds: 36000, opens: 90 } });
    const block = await checkAndBlockSite(1, 'https://news.ycombinator.com/');
    expect(block.shouldBlock).toBe(false);
  });

  it('still asks before it opens', async () => {
    const gate = await checkReflectionRequired('https://news.ycombinator.com/item?id=1');
    expect(gate).toMatchObject({ required: true, siteId: 'pause-only', delaySeconds: 10 });
  });
});

describe('a site with both a pause and a hard limit', () => {
  it('gets the pause while the day still has room', async () => {
    installStorage({ both: { timeSpentSeconds: 60, opens: 1 } });
    expect((await checkAndBlockSite(1, 'https://youtube.com/watch')).shouldBlock).toBe(false);
    expect((await checkReflectionRequired('https://youtube.com/watch')).required).toBe(true);
  });

  it('goes straight to the timeout page once the limit is spent', async () => {
    installStorage({ both: { timeSpentSeconds: 700, opens: 3 } });
    const block = await checkAndBlockSite(1, 'https://youtube.com/watch');
    expect(block.shouldBlock).toBe(true);
    expect(block.limitType).toBe('time');
  });
});

describe('a group-level pause', () => {
  it('covers its member sites', async () => {
    const gate = await checkReflectionRequired('https://instagram.com/explore');
    expect(gate).toMatchObject({
      required: true,
      siteId: 'grouped',
      limitId: 'social',
      delaySeconds: 15,
    });
  });

  it('is answered once for the whole group', async () => {
    await grantReflectionPass('social');
    expect((await checkReflectionRequired('https://instagram.com/explore')).required).toBe(
      false
    );
  });
});

/**
 * End-to-end check of path-level limits through the modules that enforce them:
 * the detector (what the popup and badge ask) and the blocker (what redirects).
 * Background scripts are neither bundled nor type-checked, so this is the only
 * thing standing between a bad wiring change and a broken release.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkIfUrlIsDistracting,
  loadDistractingSitesFromStorage,
  initializeDistractionDetector,
} from './distraction_detector.js';
import { checkAndBlockSite } from './site_blocker.js';

const TODAY = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
})();

const SITES = [
  { id: 'domain', urlPattern: 'youtube.com', dailyLimitSeconds: 3600, isEnabled: true },
  { id: 'shorts', urlPattern: 'youtube.com/shorts', dailyLimitSeconds: 600, isEnabled: true },
  { id: 'subreddit', urlPattern: 'reddit.com/r/hungary', dailyOpenLimit: 3, isEnabled: true },
];

/** Fake storage holding the sites plus a day of usage that busts the narrow limits. */
function installStorage(usage) {
  const store = {
    distractingSites: SITES,
    groups: [],
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
  };
}

beforeAll(async () => {
  installStorage({});
  await initializeDistractionDetector();
});

beforeEach(async () => {
  installStorage({});
  await loadDistractingSitesFromStorage();
});

describe('detector', () => {
  it('reports the narrow rule on a limited section', () => {
    const result = checkIfUrlIsDistracting('https://www.youtube.com/shorts/abc');
    expect(result.isMatch).toBe(true);
    expect(result.siteId).toBe('shorts');
    expect(result.matchingPattern).toBe('youtube.com/shorts');
  });

  it('falls back to the whole-site rule elsewhere on the domain', () => {
    const result = checkIfUrlIsDistracting('https://www.youtube.com/watch?v=1');
    expect(result.siteId).toBe('domain');
  });

  it('finds a subreddit-level rule', () => {
    expect(
      checkIfUrlIsDistracting('https://www.reddit.com/r/hungary/comments/1').siteId
    ).toBe('subreddit');
  });

  it('ignores a site with no rule at all', () => {
    expect(checkIfUrlIsDistracting('https://example.com/').isMatch).toBe(false);
  });
});

describe('blocker', () => {
  it('blocks the limited section once its own limit is spent', async () => {
    installStorage({ shorts: { timeSpentSeconds: 700, opens: 4 } });

    const onShorts = await checkAndBlockSite(1, 'https://www.youtube.com/shorts/abc');
    expect(onShorts.shouldBlock).toBe(true);
    expect(onShorts.siteId).toBe('shorts');
    expect(onShorts.limitType).toBe('time');
  });

  it('leaves the rest of the domain reachable', async () => {
    installStorage({ shorts: { timeSpentSeconds: 700, opens: 4 } });

    const onWatch = await checkAndBlockSite(1, 'https://www.youtube.com/watch?v=1');
    expect(onWatch.shouldBlock).toBe(false);
    expect(onWatch.siteId).toBe('domain');
  });

  it('blocks on an opens limit for a subreddit', async () => {
    installStorage({ subreddit: { timeSpentSeconds: 0, opens: 3 } });

    const result = await checkAndBlockSite(1, 'https://www.reddit.com/r/hungary/');
    expect(result.shouldBlock).toBe(true);
    expect(result.limitType).toBe('opens');
  });

  it('does not block a different subreddit', async () => {
    installStorage({ subreddit: { timeSpentSeconds: 0, opens: 3 } });

    const result = await checkAndBlockSite(1, 'https://www.reddit.com/r/other/');
    expect(result.shouldBlock).toBe(false);
    expect(result.siteId).toBeNull();
  });
});

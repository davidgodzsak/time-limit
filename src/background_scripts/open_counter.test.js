/**
 * What counts as opening a site, for the opens limit (GitHub issue #9: a
 * five-open limit on Instagram ran out within minutes of browsing stories).
 * The background handlers feed whatever the tab in front shows — after a
 * navigation, a URL change or a tab/window switch — through `recordView`;
 * these tests replay the sequences a browser produces.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isNewOpen,
  wouldOpenSite,
  recordView,
  forgetView,
  noteBrowserLeft,
  noteBrowserReturned,
  FOCUS_FLICKER_MS,
} from './open_counter.js';
import { checkAndBlockSite } from './site_blocker.js';

const TODAY = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
})();

const SITES = [
  { id: 'insta', urlPattern: 'instagram.com', dailyOpenLimit: 5, isEnabled: true },
  { id: 'yt', urlPattern: 'youtube.com', dailyLimitSeconds: 3600, isEnabled: true },
  { id: 'shorts', urlPattern: 'youtube.com/shorts', dailyOpenLimit: 3, isEnabled: true },
  { id: 'off', urlPattern: 'reddit.com', dailyOpenLimit: 3, isEnabled: false },
];

let store;

function installStorage(usage = {}) {
  store = {
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
    },
  };
}

const opens = (siteId) => store[`usageStats-${TODAY}`][siteId]?.opens ?? 0;

beforeEach(() => {
  installStorage();
});

describe('isNewOpen', () => {
  it('is an open to arrive at a rule from nowhere or from another rule', () => {
    expect(isNewOpen(undefined, 'insta')).toBe(true);
    expect(isNewOpen(null, 'insta')).toBe(true);
    expect(isNewOpen('yt', 'insta')).toBe(true);
  });

  it('is not an open to stay on the same rule, or to land on no rule', () => {
    expect(isNewOpen('insta', 'insta')).toBe(false);
    expect(isNewOpen('insta', null)).toBe(false);
  });
});

describe('recordView', () => {
  it('counts one open for browsing around inside a site', async () => {
    await recordView('https://www.instagram.com/');
    await recordView('https://www.instagram.com/stories/someone/1/');
    await recordView('https://www.instagram.com/stories/someone/2/');
    await recordView('https://www.instagram.com/p/abc/');
    await recordView('https://www.instagram.com/explore/');

    expect(opens('insta')).toBe(1);
  });

  it('does not count switching between two tabs of the same site', async () => {
    await recordView('https://www.instagram.com/');
    await recordView('https://www.instagram.com/p/abc/'); // the other tab
    await recordView('https://www.instagram.com/'); // and back

    expect(opens('insta')).toBe(1);
  });

  it('counts coming back from another limited site, even to a tab left open', async () => {
    await recordView('https://www.instagram.com/');
    await recordView('https://www.youtube.com/watch?v=1');
    await recordView('https://www.instagram.com/');
    await recordView('https://www.youtube.com/watch?v=1');
    await recordView('https://www.instagram.com/');

    expect(opens('insta')).toBe(3);
    expect(opens('yt')).toBe(2);
  });

  it('counts coming back from a page with no rule', async () => {
    await recordView('https://www.instagram.com/');
    await recordView('https://example.com/');
    await recordView('https://www.instagram.com/');

    expect(opens('insta')).toBe(2);
  });

  it('counts a single-page move into a narrower rule as opening it', async () => {
    await recordView('https://www.youtube.com/watch?v=1');
    await recordView('https://www.youtube.com/shorts/a');
    await recordView('https://www.youtube.com/shorts/b');

    expect(opens('yt')).toBe(1);
    expect(opens('shorts')).toBe(1);
  });

  it('ignores disabled rules', async () => {
    await recordView('https://www.reddit.com/');
    expect(opens('off')).toBe(0);
  });

  it('counts a burst of URL changes on arrival once', async () => {
    await Promise.all([
      recordView('https://www.instagram.com/'),
      recordView('https://www.instagram.com/?hl=en'),
      recordView('https://www.instagram.com/explore/'),
    ]);

    expect(opens('insta')).toBe(1);
  });

  it('counts nothing when the open is refused, and treats the site as left', async () => {
    const allowOpen = vi.fn(async () => false);
    const result = await recordView('https://www.instagram.com/', { allowOpen });

    expect(result).toMatchObject({ siteId: 'insta', counted: false, refused: true });
    expect(opens('insta')).toBe(0);
    expect(await wouldOpenSite('https://www.instagram.com/')).toBe(true);
  });

  it('only asks for permission on an open', async () => {
    const allowOpen = vi.fn(async () => true);
    await recordView('https://www.instagram.com/', { allowOpen });
    await recordView('https://www.instagram.com/p/abc/', { allowOpen });

    expect(allowOpen).toHaveBeenCalledTimes(1);
  });
});

describe('wouldOpenSite', () => {
  it('tells a navigation inside the site from one into it', async () => {
    expect(await wouldOpenSite('https://www.instagram.com/')).toBe(true);

    await recordView('https://www.instagram.com/');
    expect(await wouldOpenSite('https://www.instagram.com/p/abc/')).toBe(false);
    expect(await wouldOpenSite('https://www.youtube.com/')).toBe(true);
    expect(await wouldOpenSite('https://example.com/')).toBe(false);
  });

  it('starts over once the view is forgotten', async () => {
    await recordView('https://www.instagram.com/');
    await forgetView();

    expect(await wouldOpenSite('https://www.instagram.com/')).toBe(true);
  });
});

describe('leaving the browser', () => {
  it('counts coming back from another app as opening the site again', async () => {
    await recordView('https://www.instagram.com/');
    await noteBrowserLeft(10_000);
    await noteBrowserReturned(10_000 + 30_000);
    await recordView('https://www.instagram.com/');

    expect(opens('insta')).toBe(2);
  });

  it('ignores a momentary loss of focus between browser windows', async () => {
    await recordView('https://www.instagram.com/');
    await noteBrowserLeft(10_000);
    await noteBrowserReturned(10_000 + FOCUS_FLICKER_MS - 1);
    await recordView('https://www.instagram.com/');

    expect(opens('insta')).toBe(1);
  });

  it('only forgets once per absence', async () => {
    await recordView('https://www.instagram.com/');
    await noteBrowserLeft(10_000);
    await noteBrowserReturned(60_000);
    await recordView('https://www.instagram.com/');
    await noteBrowserReturned(120_000); // a window switch, browser still in focus
    await recordView('https://www.instagram.com/');

    expect(opens('insta')).toBe(2);
  });
});

describe('opens limit in the blocker', () => {
  it('blocks opening a site whose opens are used up', async () => {
    installStorage({ insta: { timeSpentSeconds: 0, opens: 5 } });

    const result = await checkAndBlockSite(1, 'https://www.instagram.com/');
    expect(result.shouldBlock).toBe(true);
    expect(result.limitType).toBe('opens');
  });

  it('allows the last open', async () => {
    installStorage({ insta: { timeSpentSeconds: 0, opens: 4 } });

    const result = await checkAndBlockSite(1, 'https://www.instagram.com/');
    expect(result.shouldBlock).toBe(false);
  });

  it('does not throw a tab out of a site it is already on', async () => {
    installStorage({ insta: { timeSpentSeconds: 0, opens: 5 } });

    const result = await checkAndBlockSite(1, 'https://www.instagram.com/p/abc/', {
      isOpen: false,
    });
    expect(result.shouldBlock).toBe(false);
  });

  it('still enforces a time limit on a tab already on the site', async () => {
    installStorage({ yt: { timeSpentSeconds: 3600, opens: 1 } });

    const result = await checkAndBlockSite(1, 'https://www.youtube.com/watch?v=1', {
      isOpen: false,
    });
    expect(result.shouldBlock).toBe(true);
    expect(result.limitType).toBe('time');
  });
});

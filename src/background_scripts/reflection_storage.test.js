import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingReflections,
  getReflectionStats,
  notePendingReflection,
  recordReflectionDecision,
  settleAbandonedReflection,
  takePendingReflection,
} from './reflection_storage.js';

const DAY = '2026-11-09';
const SITE_URL = 'https://www.instagram.com/';

let store;

beforeEach(() => {
  store = {};
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key) => ({ [key]: store[key] })),
        set: vi.fn(async (patch) => Object.assign(store, patch)),
        remove: vi.fn(async (key) => {
          delete store[key];
        }),
      },
    },
  };
});

async function dismissedCount(siteId = 'site-1') {
  return (await getReflectionStats(DAY))[siteId]?.dismissed || 0;
}

describe('abandoned pauses count as stops', () => {
  it('counts closing the pause page as a "no"', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);

    expect(await settleAbandonedReflection(DAY, 7)).toBe(true);
    expect(await dismissedCount()).toBe(1);
  });

  it('counts leaving the pause for another page as a "no"', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);

    expect(await settleAbandonedReflection(DAY, 7, 'https://news.example/')).toBe(true);
    expect(await dismissedCount()).toBe(1);
  });

  it('counts a pause only once', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);
    await settleAbandonedReflection(DAY, 7, 'https://news.example/');
    await settleAbandonedReflection(DAY, 7);

    expect(await dismissedCount()).toBe(1);
  });

  it('does not count a pause that was answered first', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);
    // The answer handler takes the entry, then the page navigates or closes.
    expect(await takePendingReflection(7)).toEqual({ siteId: 'site-1', url: SITE_URL });
    await recordReflectionDecision(DAY, 'site-1', 'proceeded');

    expect(await settleAbandonedReflection(DAY, 7, SITE_URL)).toBe(false);
    expect(await settleAbandonedReflection(DAY, 7)).toBe(false);
    expect(await getReflectionStats(DAY)).toEqual({
      'site-1': { proceeded: 1, dismissed: 0 },
    });
  });

  it('leaves the pause open when the tab reports the page behind it', async () => {
    // The redirect's source URL, or the user asking for the same page again:
    // either way the countdown is (or will be) back in front.
    await notePendingReflection(7, 'site-1', SITE_URL);

    expect(await settleAbandonedReflection(DAY, 7, SITE_URL)).toBe(false);
    expect(await dismissedCount()).toBe(0);
    expect(await settleAbandonedReflection(DAY, 7)).toBe(true);
  });

  it('ignores tabs that never showed a pause', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);

    expect(await settleAbandonedReflection(DAY, 8)).toBe(false);
    expect(await dismissedCount()).toBe(0);
  });

  it('forgets every pending pause on startup', async () => {
    await notePendingReflection(7, 'site-1', SITE_URL);
    await clearPendingReflections();

    expect(await settleAbandonedReflection(DAY, 7)).toBe(false);
  });
});

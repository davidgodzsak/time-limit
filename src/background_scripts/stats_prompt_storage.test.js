import { describe, expect, it, vi } from 'vitest';
import { markStatsPromptHandled, shouldShowStatsPrompt, STATS_READY_DAYS } from './stats_prompt_storage.js';
import { trackedDayCount } from './history_storage.js';

function installFakeStorage(initial = {}) {
  const store = { ...initial };
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

describe('stats prompt', () => {
  it('waits until enough days are recorded', async () => {
    installFakeStorage();
    expect(await shouldShowStatsPrompt(STATS_READY_DAYS - 1)).toBe(false);
    expect(await shouldShowStatsPrompt(STATS_READY_DAYS)).toBe(true);
  });

  it('never comes back once answered', async () => {
    installFakeStorage();
    await markStatsPromptHandled();
    expect(await shouldShowStatsPrompt(30)).toBe(false);
  });
});

describe('trackedDayCount', () => {
  it('counts from the first recorded day through today', () => {
    const days = {
      '2026-11-01': { s: {} },
      '2026-11-07': { s: { s1: { t: 60 } } },
      '2026-11-09': { s: { s1: { t: 60 } } },
    };
    expect(trackedDayCount({ today: '2026-11-09', days })).toBe(3);
  });

  it('is zero before anything is recorded', () => {
    expect(trackedDayCount({ today: '2026-11-09', days: { '2026-11-09': { s: {} } } })).toBe(0);
  });
});

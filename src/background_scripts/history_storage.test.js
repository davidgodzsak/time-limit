import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archivePastDays,
  buildDayEntry,
  clearHistory,
  getHistory,
  recordActivityHour,
  recordBlockedAttempt,
  shiftDate,
  HISTORY_RETENTION_DAYS,
} from './history_storage.js';
import { performDailyReset } from './daily_reset.js';

/** In-memory browser.storage.local that understands get(null), get(key) and remove. */
function installFakeStorage(initial = {}) {
  const store = JSON.parse(JSON.stringify(initial));
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key) => {
          if (key === null) return JSON.parse(JSON.stringify(store));
          if (Array.isArray(key)) return Object.fromEntries(key.map((k) => [k, store[k]]));
          return { [key]: store[key] };
        }),
        set: vi.fn(async (patch) => Object.assign(store, JSON.parse(JSON.stringify(patch)))),
        remove: vi.fn(async (keys) => {
          for (const k of [].concat(keys)) delete store[k];
        }),
      },
    },
    alarms: { create: vi.fn(), get: vi.fn() },
  };
  return store;
}

const SITES = [
  { id: 's1', urlPattern: 'youtube.com', isEnabled: true },
  { id: 's2', urlPattern: 'instagram.com', isEnabled: true, groupId: 'g1' },
];
const GROUPS = [{ id: 'g1', name: 'Social media', siteIds: ['s2'], isEnabled: true }];

describe('activity counters', () => {
  beforeEach(() => installFakeStorage());

  it('counts attempts after a limit, and their hour', async () => {
    const at22 = new Date(2026, 10, 9, 22, 15).getTime();
    await recordBlockedAttempt('2026-11-09', 's1', at22);
    await recordBlockedAttempt('2026-11-09', 's1', at22);
    const { 'activity-2026-11-09': activity } = await browser.storage.local.get('activity-2026-11-09');
    expect(activity.s1).toEqual({ b: 2, h: { 22: 2 } });
  });

  it('notes the hour of an open without counting an attempt', async () => {
    await recordActivityHour('2026-11-09', 's1', new Date(2026, 10, 9, 8, 0).getTime());
    const { 'activity-2026-11-09': activity } = await browser.storage.local.get('activity-2026-11-09');
    expect(activity.s1).toEqual({ h: { 8: 1 } });
  });
});

describe('buildDayEntry', () => {
  it('folds usage, activity, reflections and extensions into one compact day', () => {
    const day = buildDayEntry('2026-11-08', {
      distractingSites: SITES,
      'usageStats-2026-11-08': { s1: { timeSpentSeconds: 1800, opens: 4 }, s2: { timeSpentSeconds: 0, opens: 0 } },
      'activity-2026-11-08': { s1: { b: 2, h: { 21: 6 } } },
      'reflections-2026-11-08': { s2: { proceeded: 3, dismissed: 1 } },
      'extensions-2026-11-08': { g1: { extendedMinutes: 10, extendedOpens: 0, excuse: 'Planning the trip with friends tonight' } },
    });
    expect(day.s.s1).toEqual({ t: 1800, o: 4, b: 2, h: { 21: 6 } });
    // The group a site was in that day is remembered with it.
    expect(day.s.s2).toEqual({ pp: 3, pd: 1, g: 'g1' });
    expect(day.x).toEqual([{ id: 'g1', m: 10, o: 0, r: 'Planning the trip with friends tonight' }]);
  });

  it('keeps archived fields whose source key is already gone', () => {
    // Reflections outlive usage stats by a week, so a day gets archived again
    // with only its reflections left. That must not erase its time.
    const archived = { s: { s1: { t: 600, o: 2 } }, x: [{ id: 's1', m: 5, o: 0, r: 'x' }] };
    const day = buildDayEntry('2026-11-01', { 'reflections-2026-11-01': { s1: { proceeded: 1, dismissed: 2 } } }, archived);
    expect(day.s.s1).toEqual({ t: 600, o: 2, pp: 1, pd: 2 });
    expect(day.x).toEqual(archived.x);
  });
});

describe('archivePastDays', () => {
  it('archives finished days into monthly keys and leaves today live', async () => {
    const store = installFakeStorage({
      distractingSites: SITES,
      groups: GROUPS,
      'usageStats-2026-10-31': { s1: { timeSpentSeconds: 60, opens: 1 } },
      'usageStats-2026-11-08': { s1: { timeSpentSeconds: 120, opens: 2 } },
      'usageStats-2026-11-09': { s1: { timeSpentSeconds: 999, opens: 9 } },
    });
    const archived = await archivePastDays('2026-11-09', await browser.storage.local.get(null));

    expect(archived).toEqual(['2026-10-31', '2026-11-08']);
    expect(store['history-2026-10']['2026-10-31'].s.s1).toEqual({ t: 60, o: 1 });
    expect(store['history-2026-11']['2026-11-08'].s.s1).toEqual({ t: 120, o: 2 });
    expect(store['history-2026-11']['2026-11-09']).toBeUndefined();
    expect(store.historyNames).toEqual({ sites: { s1: 'youtube.com', s2: 'instagram.com' }, groups: { g1: 'Social media' } });
  });

  it('remembers the name of a site deleted since', async () => {
    const store = installFakeStorage({
      distractingSites: [],
      groups: [],
      historyNames: { sites: { old: 'reddit.com' }, groups: {} },
    });
    await archivePastDays('2026-11-09', await browser.storage.local.get(null));
    expect(store.historyNames.sites.old).toBe('reddit.com');
  });

  it(`drops days older than ${HISTORY_RETENTION_DAYS} days, and empty months with them`, async () => {
    const cutoff = shiftDate('2026-11-09', HISTORY_RETENTION_DAYS);
    const tooOld = shiftDate(cutoff, 1);
    const store = installFakeStorage({
      [`history-${tooOld.slice(0, 7)}`]: { [tooOld]: { s: { s1: { t: 5 } } } },
      [`history-${cutoff.slice(0, 7)}`]: { [tooOld]: { s: { s1: { t: 5 } } }, [cutoff]: { s: { s1: { t: 7 } } } },
    });
    await archivePastDays('2026-11-09', await browser.storage.local.get(null));
    const month = store[`history-${cutoff.slice(0, 7)}`];
    expect(month[cutoff]).toBeDefined();
    expect(month[tooOld]).toBeUndefined();
    if (tooOld.slice(0, 7) !== cutoff.slice(0, 7)) {
      expect(store[`history-${tooOld.slice(0, 7)}`]).toBeUndefined();
    }
  });
});

describe('getHistory', () => {
  it('returns archived days plus today and not-yet-archived days, built live', async () => {
    installFakeStorage({
      distractingSites: SITES,
      'history-2026-11': { '2026-11-01': { s: { s1: { t: 300 } } } },
      // The browser was closed at midnight: the 8th was never archived.
      'usageStats-2026-11-08': { s1: { timeSpentSeconds: 120, opens: 2 } },
      'usageStats-2026-11-09': { s1: { timeSpentSeconds: 60, opens: 1 } },
      'activity-2026-11-09': { s1: { b: 1, h: { 9: 2 } } },
    });
    const { days, today } = await getHistory('2026-11-09');
    expect(today).toBe('2026-11-09');
    expect(Object.keys(days).sort()).toEqual(['2026-11-01', '2026-11-08', '2026-11-09']);
    expect(days['2026-11-09'].s.s1).toEqual({ t: 60, o: 1, b: 1, h: { 9: 2 } });
  });
});

describe('clearHistory', () => {
  it('forgets statistics but keeps the usage the limits run on', async () => {
    const store = installFakeStorage({
      'history-2026-10': {},
      historyNames: {},
      'activity-2026-11-09': {},
      'usageStats-2026-11-09': { s1: { timeSpentSeconds: 60, opens: 1 } },
    });
    await clearHistory();
    expect(Object.keys(store)).toEqual(['usageStats-2026-11-09']);
  });
});

describe('daily reset', () => {
  it('archives yesterday before deleting its keys', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 0, 0, 5));
    const store = installFakeStorage({
      distractingSites: SITES,
      'usageStats-2026-11-08': { s1: { timeSpentSeconds: 120, opens: 2 } },
      'activity-2026-11-08': { s1: { b: 3 } },
      'extensions-2026-11-08': { s1: { extendedMinutes: 15, excuse: 'A long conference talk for work today' } },
    });
    await performDailyReset();
    vi.useRealTimers();

    expect(store['usageStats-2026-11-08']).toBeUndefined();
    expect(store['activity-2026-11-08']).toBeUndefined();
    expect(store['extensions-2026-11-08']).toBeUndefined();
    expect(store['history-2026-11']['2026-11-08']).toEqual({
      s: { s1: { t: 120, o: 2, b: 3 } },
      x: [{ id: 's1', m: 15, o: 0, r: 'A long conference talk for work today' }],
    });
  });
});

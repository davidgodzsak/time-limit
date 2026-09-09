import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  considerSuggestion,
  evaluateCandidate,
  getPendingSuggestionForHost,
  getSuggestionState,
  isKnownDistractingHost,
  isWorkShapedHost,
  retireSuggestion,
} from './suggestion_engine.js';
import { recordVisit, summarizeVisits, getWindowDates } from './visit_tracker.js';

const TODAY = '2026-09-10';

/** Minimal in-memory stand-in for browser.storage.local. */
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

/** Builds a visit-tracking entry with a given number of opens today. */
function visits(host, opensToday, extraDays = {}) {
  return {
    [host]: { days: { [TODAY]: opensToday, ...extraDays }, lastVisit: 0 },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('host classification', () => {
  it('treats issue trackers, mail and internal hosts as work', () => {
    expect(isWorkShapedHost('company.atlassian.net')).toBe(true);
    expect(isWorkShapedHost('github.com')).toBe(true);
    expect(isWorkShapedHost('mail.google.com')).toBe(true);
    expect(isWorkShapedHost('localhost')).toBe(true);
    expect(isWorkShapedHost('192.168.0.10')).toBe(true);
    expect(isWorkShapedHost('build.internal')).toBe(true);
  });

  it('does not mistake the usual attention traps for work', () => {
    expect(isWorkShapedHost('youtube.com')).toBe(false);
    expect(isKnownDistractingHost('youtube.com')).toBe(true);
    expect(isKnownDistractingHost('news.ycombinator.com')).toBe(true);
    expect(isKnownDistractingHost('example.com')).toBe(false);
  });
});

describe('evaluateCandidate', () => {
  it('suggests a known distracting site after a few opens', () => {
    expect(evaluateCandidate('youtube.com', { opensToday: 4 })).toEqual({
      shouldSuggest: true,
      reason: 'knownDistracting',
    });
  });

  it('leaves a known site alone while it is opened rarely', () => {
    expect(
      evaluateCandidate('youtube.com', { opensToday: 2, opensWindow: 3 })
    ).toMatchObject({ shouldSuggest: false });
  });

  it('needs a much stronger signal for an unknown site', () => {
    expect(
      evaluateCandidate('example.com', { opensToday: 5, opensWindow: 6 })
    ).toMatchObject({ shouldSuggest: false });
    expect(evaluateCandidate('example.com', { opensToday: 10 })).toMatchObject({
      shouldSuggest: true,
      reason: 'frequent',
    });
    expect(
      evaluateCandidate('example.com', {
        opensToday: 1,
        opensWindow: 30,
        activeDays: 4,
      })
    ).toMatchObject({ shouldSuggest: true });
  });

  it('never suggests a work-shaped host, however often it is opened', () => {
    expect(
      evaluateCandidate('github.com', { opensToday: 50, opensWindow: 300, activeDays: 7 })
    ).toMatchObject({ shouldSuggest: false });
  });
});

describe('considerSuggestion', () => {
  it('raises a suggestion once the thresholds are met', async () => {
    installFakeStorage({ visitTracking: visits('youtube.com', 6) });
    const suggestion = await considerSuggestion('youtube.com', TODAY);
    expect(suggestion).toMatchObject({ host: 'youtube.com', opensToday: 6 });
    expect(await getPendingSuggestionForHost('youtube.com')).not.toBeNull();
  });

  it('keeps quiet when the user switched suggestions off', async () => {
    installFakeStorage({ visitTracking: visits('youtube.com', 6) });
    expect(await considerSuggestion('youtube.com', TODAY, false)).toBeNull();
  });

  it('suggests at most one site per day', async () => {
    installFakeStorage({
      visitTracking: {
        ...visits('youtube.com', 6),
        ...visits('reddit.com', 9),
      },
    });
    expect(await considerSuggestion('youtube.com', TODAY)).not.toBeNull();
    await retireSuggestion('youtube.com');
    expect(await considerSuggestion('reddit.com', TODAY)).toBeNull();
  });

  it('never suggests a host that was already answered', async () => {
    installFakeStorage({
      visitTracking: visits('youtube.com', 9),
      limitSuggestions: { handledHosts: ['youtube.com'], pending: null, lastSuggestedDate: null },
    });
    expect(await considerSuggestion('youtube.com', TODAY)).toBeNull();
  });

  it('retiring a host clears the pending offer and remembers it', async () => {
    installFakeStorage({ visitTracking: visits('youtube.com', 6) });
    await considerSuggestion('youtube.com', TODAY);
    await retireSuggestion('youtube.com');

    const state = await getSuggestionState();
    expect(state.pending).toBeNull();
    expect(state.handledHosts).toContain('youtube.com');
    expect(await getPendingSuggestionForHost('youtube.com')).toBeNull();
  });

  it('only answers for the host the suggestion is about', async () => {
    installFakeStorage({ visitTracking: visits('youtube.com', 6) });
    await considerSuggestion('youtube.com', TODAY);
    expect(await getPendingSuggestionForHost('reddit.com')).toBeNull();
  });
});

describe('visit tracking', () => {
  it('counts one open per host and debounces repeat navigations', async () => {
    const store = installFakeStorage();
    await recordVisit('youtube.com', TODAY, 1_000_000);
    await recordVisit('youtube.com', TODAY, 1_000_000 + 60_000); // one minute later
    expect(store.visitTracking['youtube.com'].days[TODAY]).toBe(1);

    await recordVisit('youtube.com', TODAY, 1_000_000 + 10 * 60_000);
    expect(store.visitTracking['youtube.com'].days[TODAY]).toBe(2);
  });

  it('drops days that fall outside the window', async () => {
    const store = installFakeStorage({
      visitTracking: visits('youtube.com', 2, { '2026-01-01': 40 }),
    });
    await recordVisit('youtube.com', TODAY, 5_000_000);
    expect(Object.keys(store.visitTracking['youtube.com'].days)).toEqual([TODAY]);
  });

  it('summarizes today and the whole window', () => {
    const entry = { days: { [TODAY]: 3, '2026-09-09': 4 }, lastVisit: 0 };
    expect(summarizeVisits(entry, TODAY)).toEqual({
      opensToday: 3,
      opensWindow: 7,
      activeDays: 2,
    });
  });

  it('builds a seven day window ending today', () => {
    const dates = getWindowDates(TODAY);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe(TODAY);
    expect(dates[6]).toBe('2026-09-04');
  });
});

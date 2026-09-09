/**
 * @file visit_tracker.js
 * @description Counts how often unlimited sites are opened, so the extension can
 * offer a limit for the ones the user keeps returning to.
 *
 * Deliberately small: one storage key, opens per host per day, a seven-day
 * window, and a hard cap on how many hosts are remembered. Nothing leaves the
 * browser and no URLs are stored — only hostnames and counts.
 */

const STORAGE_KEY = 'visitTracking';

/** Days of history kept; older days are dropped on write and on daily reset. */
export const VISIT_WINDOW_DAYS = 7;

/** Most hosts remembered at once; the least recently seen are dropped first. */
const MAX_TRACKED_HOSTS = 300;

/** Repeat navigations to the same host inside this window count as one open. */
const REVISIT_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Extracts the hostname we count visits against (lowercase, no leading `www.`).
 *
 * @param {string} url - The URL being visited.
 * @returns {string|null} The hostname, or null for anything not http(s).
 */
export function getVisitHost(url) {
  if (!url || typeof url !== 'string') return null;
  if (!url.startsWith('http:') && !url.startsWith('https:')) return null;
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase().replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Reads the whole tracking table.
 *
 * @returns {Promise<Object>} Map of host to { days: {date: count}, lastVisit }.
 */
export async function getVisitTracking() {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || {};
  } catch (error) {
    console.error('[VisitTracker] Error reading visit tracking:', error);
    return {};
  }
}

/**
 * Drops days outside the window and hosts beyond the cap.
 *
 * @param {Object} tracking - The tracking table.
 * @param {string[]} keepDates - The dates to keep, newest first.
 * @returns {Object} A pruned copy.
 */
export function pruneVisitTracking(tracking, keepDates) {
  const keep = new Set(keepDates);
  const pruned = {};

  for (const [host, entry] of Object.entries(tracking || {})) {
    if (!entry || typeof entry !== 'object') continue;
    const days = {};
    for (const [date, count] of Object.entries(entry.days || {})) {
      if (keep.has(date) && typeof count === 'number' && count > 0) {
        days[date] = count;
      }
    }
    if (Object.keys(days).length === 0) continue;
    pruned[host] = { days, lastVisit: entry.lastVisit || 0 };
  }

  const hosts = Object.keys(pruned);
  if (hosts.length > MAX_TRACKED_HOSTS) {
    hosts
      .sort((a, b) => (pruned[b].lastVisit || 0) - (pruned[a].lastVisit || 0))
      .slice(MAX_TRACKED_HOSTS)
      .forEach((host) => delete pruned[host]);
  }

  return pruned;
}

/**
 * Builds the list of dates inside the window, newest first.
 *
 * @param {string} todayString - Today in "YYYY-MM-DD" format.
 * @param {number} [days=VISIT_WINDOW_DAYS] - How many days to include.
 * @returns {string[]} The date strings.
 */
export function getWindowDates(todayString, days = VISIT_WINDOW_DAYS) {
  const dates = [];
  const [year, month, day] = todayString.split('-').map(Number);
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(year, month - 1, day - offset);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
  }
  return dates;
}

/**
 * Records one open for a host, unless the same host was already counted a few
 * minutes ago (clicking around a site is one visit, not twenty).
 *
 * @param {string} host - The hostname to count.
 * @param {string} todayString - Today in "YYYY-MM-DD" format.
 * @param {number} [now=Date.now()] - Current time, injectable for tests.
 * @returns {Promise<Object|null>} The host's updated entry, or null when skipped.
 */
export async function recordVisit(host, todayString, now = Date.now()) {
  if (!host || !todayString) return null;

  try {
    const tracking = await getVisitTracking();
    const entry = tracking[host] || { days: {}, lastVisit: 0 };

    if (entry.lastVisit && now - entry.lastVisit < REVISIT_DEBOUNCE_MS) {
      return null;
    }

    entry.days[todayString] = (entry.days[todayString] || 0) + 1;
    entry.lastVisit = now;
    tracking[host] = entry;

    const pruned = pruneVisitTracking(tracking, getWindowDates(todayString));
    await browser.storage.local.set({ [STORAGE_KEY]: pruned });
    return pruned[host] || entry;
  } catch (error) {
    console.error('[VisitTracker] Error recording visit:', error);
    return null;
  }
}

/**
 * Sums the opens for a host today and across the whole window.
 *
 * @param {Object} entry - A host's tracking entry.
 * @param {string} todayString - Today in "YYYY-MM-DD" format.
 * @returns {{opensToday: number, opensWindow: number, activeDays: number}}
 */
export function summarizeVisits(entry, todayString) {
  if (!entry || !entry.days) {
    return { opensToday: 0, opensWindow: 0, activeDays: 0 };
  }
  const days = Object.entries(entry.days);
  return {
    opensToday: entry.days[todayString] || 0,
    opensWindow: days.reduce((total, [, count]) => total + count, 0),
    activeDays: days.length,
  };
}

/**
 * Forgets a host entirely — used when it gets a limit, so its counts stop
 * competing with genuinely unlimited sites.
 *
 * @param {string} host - The hostname to forget.
 * @returns {Promise<void>}
 */
export async function forgetHost(host) {
  if (!host) return;
  try {
    const tracking = await getVisitTracking();
    if (tracking[host]) {
      delete tracking[host];
      await browser.storage.local.set({ [STORAGE_KEY]: tracking });
    }
  } catch (error) {
    console.error('[VisitTracker] Error forgetting host:', error);
  }
}

/**
 * Removes days that fell out of the window. Called by the daily reset.
 *
 * @param {string} todayString - Today in "YYYY-MM-DD" format.
 * @returns {Promise<void>}
 */
export async function pruneOldVisits(todayString) {
  try {
    const tracking = await getVisitTracking();
    const pruned = pruneVisitTracking(tracking, getWindowDates(todayString));
    await browser.storage.local.set({ [STORAGE_KEY]: pruned });
  } catch (error) {
    console.error('[VisitTracker] Error pruning visits:', error);
  }
}

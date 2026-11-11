/**
 * @file history_storage.js
 * @description A year of daily statistics, for the statistics page.
 *
 * The per-day keys the limits run on (`usageStats-*`, `extensions-*`) are
 * deleted by the daily reset, and reflections only live for a week. Before the
 * reset deletes them, `archivePastDays` folds every finished day into a compact
 * monthly history. Today is never archived: `getStatistics` reads it live.
 *
 * Storage:
 * - `activity-YYYY-MM-DD`: { [siteId]: { b, h } } — today's counters that
 *   nothing else records: `b` attempts to open a site after its limit was spent
 *   (or while blocked), `h` opens/attempts per local hour as { "22": 3 }.
 *   Deleted with the other per-day keys once archived.
 * - `history-YYYY-MM`: { "YYYY-MM-DD": { s: { [siteId]: Day }, x: Ext[] } }
 *   Day = { t: seconds, o: opens, b, pp: pauses passed, pd: pauses turned
 *   down, h: { hour: count }, g?: groupId at the time }. Zero fields are left
 *   out. Ext = { id: site|group id, m: minutes, o: opens, r: reason }.
 * - `historyNames`: { sites: { [id]: urlPattern }, groups: { [id]: name } } —
 *   so a site deleted later still has a name in its old weeks.
 *
 * Kept for HISTORY_RETENTION_DAYS. Only site ids, url patterns the user typed
 * themselves and counts are stored — never a visited URL.
 */

export const HISTORY_RETENTION_DAYS = 365;

const ACTIVITY_PREFIX = 'activity-';
const HISTORY_PREFIX = 'history-';
const NAMES_KEY = 'historyNames';
/** Per-day keys whose contents are folded into the history. */
const DAILY_PREFIXES = ['usageStats-', ACTIVITY_PREFIX, 'reflections-', 'extensions-'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The user's "collect statistics" switch (Settings → Preferences). On unless
 * explicitly turned off. When off nothing is recorded or archived, and turning
 * it off deletes what was collected (see `updateDisplayPreferences`).
 *
 * @param {Object} [preferences] - `displayPreferences`, when already read.
 * @returns {boolean}
 */
export function statisticsEnabledIn(preferences) {
  return preferences?.collectStatistics !== false;
}

/** Reads the switch from storage. */
export async function isStatisticsEnabled() {
  try {
    const { displayPreferences } = await browser.storage.local.get('displayPreferences');
    return statisticsEnabledIn(displayPreferences);
  } catch {
    return true;
  }
}

/**
 * Adds one to a site's counter in today's activity key.
 *
 * @param {string} dateString - Local day, "YYYY-MM-DD".
 * @param {string} siteId - The matched site.
 * @param {{blocked?: boolean, now?: number}} [options] - `blocked` also counts an attempt.
 * @returns {Promise<void>}
 */
async function _bumpActivity(dateString, siteId, { blocked = false, now = Date.now() } = {}) {
  if (!dateString || !siteId) return;
  if (!(await isStatisticsEnabled())) return;
  const key = `${ACTIVITY_PREFIX}${dateString}`;
  try {
    const result = await browser.storage.local.get(key);
    const activity = result[key] || {};
    const entry = activity[siteId] || {};
    const hour = String(new Date(now).getHours());
    entry.h = { ...(entry.h || {}), [hour]: ((entry.h || {})[hour] || 0) + 1 };
    if (blocked) entry.b = (entry.b || 0) + 1;
    activity[siteId] = entry;
    await browser.storage.local.set({ [key]: activity });
  } catch (error) {
    console.error('[History] Error recording activity:', error);
  }
}

/**
 * Notes the hour of an open or a pause turned down, for the hour heatmap.
 *
 * @param {string} dateString - Local day.
 * @param {string} siteId - The site.
 * @param {number} [now] - Timestamp, for tests.
 */
export function recordActivityHour(dateString, siteId, now = Date.now()) {
  return _bumpActivity(dateString, siteId, { now });
}

/**
 * Counts an attempt to open a site the timeout page turned away: its limit was
 * used up, or it is blocked outright. "How hard was this limit to keep."
 *
 * @param {string} dateString - Local day.
 * @param {string} siteId - The matched site.
 * @param {number} [now] - Timestamp, for tests.
 */
export function recordBlockedAttempt(dateString, siteId, now = Date.now()) {
  return _bumpActivity(dateString, siteId, { blocked: true, now });
}

/**
 * Builds one day's history entry from the per-day keys present in a storage
 * snapshot, on top of whatever was archived for that day before. Fields only
 * change when their source key is present, so archiving the same day twice —
 * reflections outlive usage stats by a week — never wipes what is there.
 *
 * Pure, for tests.
 *
 * @param {string} date - "YYYY-MM-DD".
 * @param {Object} all - Storage snapshot.
 * @param {Object} [existing] - The day as archived so far.
 * @returns {{s: Object, x?: Array}} The merged day.
 */
export function buildDayEntry(date, all, existing = { s: {} }) {
  const s = {};
  for (const [id, day] of Object.entries(existing.s || {})) s[id] = { ...day };
  const at = (id) => (s[id] = s[id] || {});

  const usage = all[`usageStats-${date}`];
  if (usage) {
    for (const [id, u] of Object.entries(usage)) {
      const day = at(id);
      if (u.timeSpentSeconds) day.t = u.timeSpentSeconds; else delete day.t;
      if (u.opens) day.o = u.opens; else delete day.o;
    }
  }

  const activity = all[`${ACTIVITY_PREFIX}${date}`];
  if (activity) {
    for (const [id, a] of Object.entries(activity)) {
      const day = at(id);
      if (a.b) day.b = a.b; else delete day.b;
      if (a.h && Object.keys(a.h).length) day.h = { ...a.h }; else delete day.h;
    }
  }

  const reflections = all[`reflections-${date}`];
  if (reflections) {
    for (const [id, r] of Object.entries(reflections)) {
      const day = at(id);
      if (r.proceeded) day.pp = r.proceeded; else delete day.pp;
      if (r.dismissed) day.pd = r.dismissed; else delete day.pd;
    }
  }

  // Remember which group each site belonged to that day, the first time we see it.
  const sites = all.distractingSites || [];
  for (const [id, day] of Object.entries(s)) {
    if (day.g === undefined) {
      const site = sites.find((x) => x.id === id);
      if (site && site.groupId) day.g = site.groupId;
    }
    if (Object.keys(day).every((k) => k === 'g')) delete s[id];
  }

  const entry = { s };
  const extensions = all[`extensions-${date}`];
  if (extensions) {
    entry.x = Object.entries(extensions).map(([id, e]) => ({
      id,
      m: e.extendedMinutes || 0,
      o: e.extendedOpens || 0,
      r: typeof e.excuse === 'string' ? e.excuse : '',
    }));
  } else if (existing.x) {
    entry.x = existing.x;
  }
  return entry;
}

/** The dates (before today) that still have per-day keys to fold in. */
function _pendingDates(all, todayString) {
  const dates = new Set();
  for (const key of Object.keys(all)) {
    const prefix = DAILY_PREFIXES.find((p) => key.startsWith(p));
    if (!prefix) continue;
    const date = key.slice(prefix.length);
    if (DATE_RE.test(date) && date < todayString) dates.add(date);
  }
  return [...dates].sort();
}

/** "YYYY-MM-DD" for `days` before the given local day. */
export function shiftDate(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Current names of sites and groups, merged over the remembered ones. */
function _mergedNames(all) {
  const names = all[NAMES_KEY] || { sites: {}, groups: {} };
  const sites = { ...(names.sites || {}) };
  const groups = { ...(names.groups || {}) };
  for (const site of all.distractingSites || []) sites[site.id] = site.urlPattern;
  for (const group of all.groups || []) groups[group.id] = group.name;
  return { sites, groups };
}

/**
 * Folds every finished day still sitting in per-day keys into the monthly
 * history, refreshes the remembered names and drops days past the retention
 * window. Called by the daily reset right before it deletes those keys.
 *
 * @param {string} todayString - Today, "YYYY-MM-DD"; never archived.
 * @param {Object} all - Storage snapshot (`browser.storage.local.get(null)`).
 * @returns {Promise<string[]>} The dates that were archived.
 */
export async function archivePastDays(todayString, all) {
  // Switched off: the per-day keys are deleted by the reset as usual, and
  // nothing is kept from them.
  if (!statisticsEnabledIn(all.displayPreferences)) return [];
  const dates = _pendingDates(all, todayString);
  const cutoff = shiftDate(todayString, HISTORY_RETENTION_DAYS);
  const months = {};
  const monthOf = (key) => (months[key] = months[key] || { ...(all[key] || {}) });

  for (const date of dates) {
    if (date < cutoff) continue;
    const month = monthOf(`${HISTORY_PREFIX}${date.slice(0, 7)}`);
    month[date] = buildDayEntry(date, all, month[date]);
  }

  // Retention: only the oldest month or two can hold expired days, so only
  // months that start before the cutoff are touched (and dropped once empty).
  for (const key of Object.keys(all)) {
    if (!key.startsWith(HISTORY_PREFIX) || key.slice(HISTORY_PREFIX.length) > cutoff.slice(0, 7)) continue;
    const month = monthOf(key);
    for (const date of Object.keys(month)) if (date < cutoff) delete month[date];
  }
  const toRemove = Object.keys(months).filter((key) => Object.keys(months[key]).length === 0);
  for (const key of toRemove) delete months[key];

  await browser.storage.local.set({ ...months, [NAMES_KEY]: _mergedNames(all) });
  if (toRemove.length) await browser.storage.local.remove(toRemove);
  return dates;
}

/**
 * Everything the statistics page needs, in one read: the archived days, plus
 * today and any days the reset has not archived yet, built live.
 *
 * @param {string} todayString - Today, "YYYY-MM-DD".
 * @returns {Promise<{today: string, days: Object, names: Object}>}
 */
export async function getHistory(todayString) {
  const all = await browser.storage.local.get(null);
  const days = {};
  for (const [key, month] of Object.entries(all)) {
    if (key.startsWith(HISTORY_PREFIX)) Object.assign(days, month);
  }
  for (const date of [..._pendingDates(all, todayString), todayString]) {
    days[date] = buildDayEntry(date, all, days[date]);
  }
  return { today: todayString, days, names: _mergedNames(all) };
}

/**
 * Forgets all statistics: the history, the remembered names and the activity
 * counters. Today's usage stays — the limits run on it.
 *
 * @returns {Promise<void>}
 */
export async function clearHistory() {
  const all = await browser.storage.local.get(null);
  const keys = Object.keys(all).filter(
    (key) => key.startsWith(HISTORY_PREFIX) || key.startsWith(ACTIVITY_PREFIX) || key === NAMES_KEY
  );
  if (keys.length) await browser.storage.local.remove(keys);
}

/**
 * How many days the history spans, from the first recorded day through today
 * (inclusive); 0 when nothing has been recorded. Same rule as `buildTimeline`
 * in `lib/stats/aggregate.ts`, so the background and the page agree on when
 * there is "enough" to show.
 *
 * @param {{today: string, days: Object}} history - From `getHistory`.
 * @returns {number}
 */
export function trackedDayCount({ today, days }) {
  const first = Object.entries(days)
    .filter(([, day]) => Object.keys(day.s || {}).length > 0 || (day.x || []).length > 0)
    .map(([date]) => date)
    .sort()[0];
  if (!first) return 0;
  const [y1, m1, d1] = first.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86_400_000) + 1;
}

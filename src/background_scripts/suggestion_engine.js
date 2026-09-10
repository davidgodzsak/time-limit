/**
 * @file suggestion_engine.js
 * @description Decides when to offer a limit for a site the user keeps opening,
 * and remembers the answer so the offer is never repeated.
 *
 * The rules are deliberately conservative — a nagging extension gets uninstalled:
 * - one new suggestion per day, and only one waiting at a time;
 * - a host is suggested at most once, ever (accepting or dismissing retires it);
 * - work-shaped hosts (issue trackers, code hosting, mail, docs, intranets) are
 *   never suggested, because time spent there is usually time well spent;
 * - the user can switch suggestions off entirely in preferences.
 */

import { getVisitTracking, summarizeVisits } from './visit_tracker.js';

const STATE_KEY = 'limitSuggestions';

/** Hosts that are usually work, not distraction. Matched as substrings. */
const WORK_HINTS = [
  'jira',
  'atlassian',
  'confluence',
  'github',
  'gitlab',
  'bitbucket',
  'stackoverflow',
  'localhost',
  'notion.so',
  'figma.com',
  'slack.com',
  'teams.microsoft',
  'office.com',
  'sharepoint',
  'outlook',
  'gmail',
  'mail.google',
  'docs.google',
  'drive.google',
  'calendar.google',
  'zoom.us',
  'meet.google',
  'asana',
  'linear.app',
  'monday.com',
  'trello',
  'salesforce',
  'workday',
  'sentry.io',
  'datadoghq',
  'grafana',
  'npmjs.com',
  'developer.mozilla.org',
];

/** Hosts whose whole business model is keeping people scrolling. */
const DISTRACTING_HINTS = [
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'youtube.com',
  'twitch.tv',
  'netflix.com',
  'pinterest.com',
  'snapchat.com',
  'tumblr.com',
  '9gag.com',
  'imgur.com',
  'buzzfeed.com',
  'dailymail',
  'news.ycombinator.com',
  'linkedin.com',
  'threads.net',
  'bsky.app',
  'mastodon',
  'quora.com',
  'ebay.',
  'amazon.',
  'aliexpress',
  'temu.com',
  'shein.com',
];

/** Opens today before a known distracting site is worth mentioning. */
const KNOWN_OPENS_TODAY = 4;
/** Opens across the tracked window before a known distracting site qualifies. */
const KNOWN_OPENS_WINDOW = 8;
/** Opens today before an unknown site looks compulsive rather than useful. */
const OTHER_OPENS_TODAY = 10;
/** Opens across the window for an unknown site, paired with several active days. */
const OTHER_OPENS_WINDOW = 25;
const OTHER_ACTIVE_DAYS = 3;

/**
 * Reports whether a host looks like work rather than distraction.
 *
 * @param {string} host - Hostname, lowercase and without `www.`.
 * @returns {boolean} True when the host should never be suggested.
 */
export function isWorkShapedHost(host) {
  if (!host || typeof host !== 'string') return true;
  // Bare hostnames and IPs are internal tools far more often than distractions.
  if (!host.includes('.')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test')) {
    return true;
  }
  return WORK_HINTS.some((hint) => host.includes(hint));
}

/**
 * Reports whether a host is on the known-distraction list.
 *
 * @param {string} host - Hostname, lowercase and without `www.`.
 * @returns {boolean} True for the usual attention traps.
 */
export function isKnownDistractingHost(host) {
  if (!host || typeof host !== 'string') return false;
  return DISTRACTING_HINTS.some((hint) => host.includes(hint));
}

/**
 * Scores one host against the thresholds. Pure, so the heuristic can be tested
 * without touching storage.
 *
 * @param {string} host - Hostname, lowercase and without `www.`.
 * @param {{opensToday: number, opensWindow: number, activeDays: number}} stats - Visit counts.
 * @returns {{shouldSuggest: boolean, reason: string|null}} Why it qualified, for the UI copy.
 */
export function evaluateCandidate(host, stats) {
  const { opensToday = 0, opensWindow = 0, activeDays = 0 } = stats || {};

  if (isWorkShapedHost(host)) return { shouldSuggest: false, reason: null };

  if (isKnownDistractingHost(host)) {
    if (opensToday >= KNOWN_OPENS_TODAY || opensWindow >= KNOWN_OPENS_WINDOW) {
      return { shouldSuggest: true, reason: 'knownDistracting' };
    }
    return { shouldSuggest: false, reason: null };
  }

  if (
    opensToday >= OTHER_OPENS_TODAY ||
    (opensWindow >= OTHER_OPENS_WINDOW && activeDays >= OTHER_ACTIVE_DAYS)
  ) {
    return { shouldSuggest: true, reason: 'frequent' };
  }

  return { shouldSuggest: false, reason: null };
}

/**
 * Reads the suggestion bookkeeping.
 *
 * @returns {Promise<{handledHosts: string[], pending: Object|null, lastSuggestedDate: string|null}>}
 */
export async function getSuggestionState() {
  try {
    const result = await browser.storage.local.get(STATE_KEY);
    const state = result[STATE_KEY] || {};
    return {
      handledHosts: Array.isArray(state.handledHosts) ? state.handledHosts : [],
      pending: state.pending || null,
      lastSuggestedDate: state.lastSuggestedDate || null,
    };
  } catch (error) {
    console.error('[SuggestionEngine] Error reading suggestion state:', error);
    return { handledHosts: [], pending: null, lastSuggestedDate: null };
  }
}

/**
 * Writes the suggestion bookkeeping back.
 *
 * @param {Object} state - The full state object to persist.
 * @returns {Promise<boolean>} True on success.
 */
async function _setSuggestionState(state) {
  try {
    await browser.storage.local.set({ [STATE_KEY]: state });
    return true;
  } catch (error) {
    console.error('[SuggestionEngine] Error writing suggestion state:', error);
    return false;
  }
}

/**
 * Considers a host for a suggestion and stores it as pending when it qualifies.
 * Returns the suggestion only when it is newly raised, so the caller knows
 * whether to nudge the user.
 *
 * @param {string} host - The host just visited.
 * @param {string} todayString - Today in "YYYY-MM-DD" format.
 * @param {boolean} [enabled=true] - The user's "suggest limits" preference.
 * @returns {Promise<Object|null>} The new suggestion, or null when nothing to say.
 */
export async function considerSuggestion(host, todayString, enabled = true) {
  if (!enabled || !host) return null;

  const state = await getSuggestionState();
  if (state.handledHosts.includes(host)) return null;
  if (state.pending) return null; // one waiting offer at a time
  if (state.lastSuggestedDate === todayString) return null; // at most one a day

  const tracking = await getVisitTracking();
  const stats = summarizeVisits(tracking[host], todayString);
  const { shouldSuggest, reason } = evaluateCandidate(host, stats);
  if (!shouldSuggest) return null;

  const suggestion = {
    host,
    reason,
    opensToday: stats.opensToday,
    opensWindow: stats.opensWindow,
    createdAt: Date.now(),
  };

  await _setSuggestionState({
    ...state,
    pending: suggestion,
    lastSuggestedDate: todayString,
  });

  return suggestion;
}

/**
 * Returns the waiting suggestion when it is about this host, so the popup only
 * ever nudges on the page the suggestion is for.
 *
 * @param {string} host - The host the popup is showing.
 * @returns {Promise<Object|null>} The pending suggestion, or null.
 */
export async function getPendingSuggestionForHost(host) {
  if (!host) return null;
  const state = await getSuggestionState();
  if (!state.pending || state.pending.host !== host) return null;
  return state.pending;
}

/**
 * Retires a host: it will never be suggested again. Used both when the user
 * says "not this site" and when they accept and the site gets a limit.
 *
 * @param {string} host - The host to retire.
 * @returns {Promise<boolean>} True on success.
 */
export async function retireSuggestion(host) {
  if (!host) return false;
  const state = await getSuggestionState();
  const handledHosts = state.handledHosts.includes(host)
    ? state.handledHosts
    : [...state.handledHosts, host];

  return _setSuggestionState({
    ...state,
    handledHosts,
    pending: state.pending && state.pending.host === host ? null : state.pending,
  });
}

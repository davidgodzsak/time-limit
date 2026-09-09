/**
 * @file reflection_gate.js
 * @description The reflection delay: a softer alternative to a hard block.
 * A site (or group) can ask for a short pause before it opens — a countdown
 * screen, then "do you still want to open this?". Yes continues to the exact
 * original URL, No goes to the usual timeout page.
 *
 * How it sits next to the hard limits (decided once, here, so the rest of the
 * code does not have to guess):
 *
 * 1. **The block check runs first.** If the day's time or opens limit is
 *    already used up, the user goes straight to the timeout page. Counting to
 *    ten before a door that is locked anyway is pure friction.
 * 2. **Otherwise the delay runs**, and only for sites that are still openable.
 * 3. **Answering "yes" grants a pass** (see reflection_storage.js) so browsing
 *    inside the site does not restart the countdown on every click. Answering
 *    "no" clears any pass.
 *
 * Whose delay applies: the group's, when the site is in an enabled group that
 * sets one; otherwise the site's own. Unlike time/opens limits — where the
 * group replaces the site's config entirely — a site keeps its own delay when
 * its group has none, so adding a site to a group never silently drops it.
 */

import { getDistractingSites } from './site_storage.js';
import { getGroups } from './group_storage.js';
import { findMatchingSite } from './url_matcher.js';
import { hasReflectionPass } from './reflection_storage.js';

/** Path of the reflection page inside the extension. */
export const REFLECTION_PAGE_PATH = 'pages/reflect/index.html';

/**
 * Works out which reflection delay covers a URL, if any.
 * Pure apart from its inputs, so it can be tested without storage.
 *
 * @param {string} url - The URL being navigated to.
 * @param {Array<Object>} sites - All distracting sites.
 * @param {Array<Object>} groups - All groups.
 * @returns {{siteId: string, limitId: string, groupId: string|null, delaySeconds: number}|null}
 *          The delay that applies, or null when the URL has none.
 */
export function resolveReflectionDelay(url, sites, groups) {
  const site = findMatchingSite(url, sites, (candidate) => candidate.isEnabled !== false);
  if (!site) return null;

  let group = null;
  if (site.groupId && Array.isArray(groups)) {
    const candidate = groups.find((g) => g.id === site.groupId);
    if (candidate && candidate.isEnabled !== false) {
      group = candidate;
    }
  }

  const delaySeconds =
    (group && typeof group.reflectionDelaySeconds === 'number'
      ? group.reflectionDelaySeconds
      : null) ??
    (typeof site.reflectionDelaySeconds === 'number'
      ? site.reflectionDelaySeconds
      : null);

  if (!delaySeconds || delaySeconds <= 0) return null;

  return {
    siteId: site.id,
    // The pass is shared with whichever limit is being enforced, so a group
    // with a delay asks once for the whole group rather than per site.
    limitId: group ? group.id : site.id,
    groupId: group ? group.id : null,
    delaySeconds,
  };
}

/**
 * Decides whether this navigation should be interrupted by a countdown.
 * Call it only after the hard block check has already passed.
 *
 * @param {string} url - The URL being navigated to.
 * @returns {Promise<{required: boolean, siteId: string|null, limitId: string|null,
 *          groupId: string|null, delaySeconds: number}>}
 */
export async function checkReflectionRequired(url) {
  const none = {
    required: false,
    siteId: null,
    limitId: null,
    groupId: null,
    delaySeconds: 0,
  };

  if (!url || typeof url !== 'string') return none;
  if (!url.startsWith('http:') && !url.startsWith('https:')) return none;

  try {
    const [sites, groups] = await Promise.all([getDistractingSites(), getGroups()]);
    const match = resolveReflectionDelay(url, sites, groups);
    if (!match) return none;

    // A recent "yes" covers the next few minutes of browsing on that site.
    if (await hasReflectionPass(match.limitId)) return none;

    return { required: true, ...match };
  } catch (error) {
    console.error('[ReflectionGate] Error checking reflection delay:', error);
    // On error let the navigation through; a broken pause must not lock a site.
    return none;
  }
}

/**
 * Builds the reflection page URL, carrying the original destination verbatim so
 * a deep link (query string, hash and all) survives the round trip.
 *
 * @param {string} originalUrl - The URL the user asked for.
 * @param {{siteId: string, delaySeconds: number}} match - The applicable delay.
 * @returns {string} The extension page URL to send the tab to.
 */
export function buildReflectionUrl(originalUrl, match) {
  const params = new URLSearchParams({
    url: originalUrl,
    siteId: match.siteId,
    seconds: String(match.delaySeconds),
  });
  return `${browser.runtime.getURL(REFLECTION_PAGE_PATH)}?${params.toString()}`;
}

/**
 * Reports whether a tab is currently sitting on the reflection page.
 *
 * @param {string} url - The tab URL to test.
 * @returns {boolean} True for the extension's reflection page.
 */
export function isReflectionPage(url) {
  return typeof url === 'string' && url.includes(REFLECTION_PAGE_PATH);
}

/**
 * @file reflection_storage.js
 * @description Storage for the reflection delay: the short-lived "passes" that
 * keep the countdown from reappearing on every click inside a site, and the
 * daily tally of how the user answered ("yes, open it" / "no, not now").
 *
 * Two keys:
 * - `reflectionPasses`: { [limitId]: expiresAtMs } — limitId is the group id for
 *   grouped sites, otherwise the site id, matching how limits are enforced.
 * - `reflections-YYYY-MM-DD`: { [siteId]: { proceeded, dismissed } } — the most
 *   honest signal we have about which sites are actually worth limiting, so it
 *   is kept per day exactly like usage stats.
 */

const PASSES_KEY = 'reflectionPasses';

/** How long a "yes, open it" answer keeps the countdown away, in ms. */
export const PASS_DURATION_MS = 20 * 60 * 1000;

/**
 * Reads all passes, dropping the ones that have expired.
 *
 * @returns {Promise<Object>} Map of limitId to expiry timestamp.
 */
export async function getReflectionPasses() {
  try {
    const result = await browser.storage.local.get(PASSES_KEY);
    const passes = result[PASSES_KEY] || {};
    const now = Date.now();
    const live = {};
    for (const [limitId, expiresAt] of Object.entries(passes)) {
      if (typeof expiresAt === 'number' && expiresAt > now) {
        live[limitId] = expiresAt;
      }
    }
    return live;
  } catch (error) {
    console.error('[ReflectionStorage] Error reading passes:', error);
    return {};
  }
}

/**
 * Reports whether a limit currently holds a valid pass.
 *
 * @param {string} limitId - Group id for grouped sites, otherwise the site id.
 * @returns {Promise<boolean>} True while the user may browse without a countdown.
 */
export async function hasReflectionPass(limitId) {
  if (!limitId) return false;
  const passes = await getReflectionPasses();
  return !!passes[limitId];
}

/**
 * Grants a pass so the user is not asked again for the next few minutes.
 *
 * @param {string} limitId - Group id for grouped sites, otherwise the site id.
 * @param {number} [durationMs=PASS_DURATION_MS] - How long the pass lasts.
 * @returns {Promise<boolean>} True on success.
 */
export async function grantReflectionPass(limitId, durationMs = PASS_DURATION_MS) {
  if (!limitId || typeof limitId !== 'string') return false;
  try {
    const passes = await getReflectionPasses();
    passes[limitId] = Date.now() + durationMs;
    await browser.storage.local.set({ [PASSES_KEY]: passes });
    return true;
  } catch (error) {
    console.error('[ReflectionStorage] Error granting pass:', error);
    return false;
  }
}

/**
 * Drops a pass, so the next visit shows the countdown again. Used when the user
 * answers "no" — the decision should not leave the door open behind them.
 *
 * @param {string} limitId - Group id for grouped sites, otherwise the site id.
 * @returns {Promise<boolean>} True on success.
 */
export async function clearReflectionPass(limitId) {
  if (!limitId || typeof limitId !== 'string') return false;
  try {
    const passes = await getReflectionPasses();
    delete passes[limitId];
    await browser.storage.local.set({ [PASSES_KEY]: passes });
    return true;
  } catch (error) {
    console.error('[ReflectionStorage] Error clearing pass:', error);
    return false;
  }
}

/**
 * Reads the reflection answers recorded on a given day.
 *
 * @param {string} dateString - Day in "YYYY-MM-DD" format.
 * @returns {Promise<Object>} Map of siteId to { proceeded, dismissed }.
 */
export async function getReflectionStats(dateString) {
  if (!dateString || typeof dateString !== 'string') return {};
  const key = `reflections-${dateString}`;
  try {
    const result = await browser.storage.local.get(key);
    return result[key] || {};
  } catch (error) {
    console.error(
      `[ReflectionStorage] Error reading reflection stats for ${dateString}:`,
      error
    );
    return {};
  }
}

/**
 * Records one answer to the reflection prompt.
 *
 * @param {string} dateString - Day in "YYYY-MM-DD" format.
 * @param {string} siteId - The site the user was heading to.
 * @param {'proceeded'|'dismissed'} decision - What the user chose.
 * @returns {Promise<Object|null>} The site's updated counts, or null on failure.
 */
export async function recordReflectionDecision(dateString, siteId, decision) {
  if (!dateString || !siteId) return null;
  if (decision !== 'proceeded' && decision !== 'dismissed') {
    console.error('[ReflectionStorage] Unknown reflection decision:', decision);
    return null;
  }

  const key = `reflections-${dateString}`;
  try {
    const stats = await getReflectionStats(dateString);
    const entry = stats[siteId] || { proceeded: 0, dismissed: 0 };
    entry[decision] += 1;
    stats[siteId] = entry;
    await browser.storage.local.set({ [key]: stats });
    return entry;
  } catch (error) {
    console.error(
      `[ReflectionStorage] Error recording reflection for site ${siteId}:`,
      error
    );
    return null;
  }
}

/*
 * Pending pauses: which tab is sitting on the countdown, and for which site.
 *
 * Closing the pause page, or leaving it for another page, is as much a "no" as
 * the button — the user reached for the site and then did not go. The page
 * cannot report that itself (a message sent while the tab closes is not
 * reliably delivered), so the background remembers each pause it starts and
 * settles it when the tab goes: an answer takes the entry first, and whatever
 * is still pending when the tab closes or navigates away counts as dismissed.
 *
 * `pendingReflections`: { [tabId]: { siteId, url } } — `url` is the page the
 * pause stands in front of. Tab ids do not survive a browser restart, so the
 * map is cleared on startup.
 */
const PENDING_KEY = 'pendingReflections';

async function _readPending() {
  const result = await browser.storage.local.get(PENDING_KEY);
  return result[PENDING_KEY] || {};
}

/**
 * Remembers that a tab was just sent to the pause page.
 *
 * @param {number} tabId - The tab showing the countdown.
 * @param {string} siteId - The site the user was heading to.
 * @param {string} url - The page waiting behind the pause.
 * @returns {Promise<boolean>} True on success.
 */
export async function notePendingReflection(tabId, siteId, url) {
  if (typeof tabId !== 'number' || !siteId) return false;
  try {
    const pending = await _readPending();
    pending[tabId] = { siteId, url: url || '' };
    await browser.storage.local.set({ [PENDING_KEY]: pending });
    return true;
  } catch (error) {
    console.error('[ReflectionStorage] Error noting pending pause:', error);
    return false;
  }
}

/**
 * Removes and returns a tab's pending pause, if it has one.
 *
 * @param {number} tabId - The tab.
 * @returns {Promise<{siteId: string, url: string}|null>} The entry, or null.
 */
export async function takePendingReflection(tabId) {
  if (typeof tabId !== 'number') return null;
  try {
    const pending = await _readPending();
    const entry = pending[tabId];
    if (!entry) return null;
    delete pending[tabId];
    await browser.storage.local.set({ [PENDING_KEY]: pending });
    return entry;
  } catch (error) {
    console.error('[ReflectionStorage] Error reading pending pause:', error);
    return null;
  }
}

/**
 * Settles a pause the user walked away from: the tab closed, or moved on to a
 * page other than the pause page and the one behind it. Counts as "dismissed".
 *
 * Returning to the very page behind the pause is left alone — that navigation
 * is sent straight back through the countdown, so the pause is still open.
 *
 * @param {string} dateString - Day in "YYYY-MM-DD" format.
 * @param {number} tabId - The tab that closed or navigated.
 * @param {string} [newUrl] - Where it went; omitted when the tab closed.
 * @returns {Promise<boolean>} True if a stop was counted.
 */
export async function settleAbandonedReflection(dateString, tabId, newUrl) {
  if (typeof tabId !== 'number') return false;
  try {
    const pending = await _readPending();
    const entry = pending[tabId];
    if (!entry) return false;
    if (newUrl !== undefined && newUrl === entry.url) return false;

    delete pending[tabId];
    await browser.storage.local.set({ [PENDING_KEY]: pending });
    return !!(await recordReflectionDecision(dateString, entry.siteId, 'dismissed'));
  } catch (error) {
    console.error('[ReflectionStorage] Error settling abandoned pause:', error);
    return false;
  }
}

/**
 * Forgets every pending pause. Used on browser startup, when tab ids restart.
 *
 * @returns {Promise<void>}
 */
export async function clearPendingReflections() {
  try {
    await browser.storage.local.remove(PENDING_KEY);
  } catch (error) {
    console.error('[ReflectionStorage] Error clearing pending pauses:', error);
  }
}

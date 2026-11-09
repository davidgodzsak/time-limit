/**
 * @file stats_prompt_storage.js
 * @description The one-time popup note that the statistics page has something
 * to show. Statistics start empty for everyone (history only began with the
 * release that added them), so the page is not worth pointing at on day one;
 * once STATS_READY_DAYS are recorded, the popup says so, once.
 *
 * Non-nagging, like the rating prompt and limit suggestions: either answer
 * ("see statistics" or "not now") retires it for good, and so does simply
 * finding the page on one's own once it has enough to show.
 */

const STATS_PROMPT_KEY = 'statsPromptState';

/** Mirrors MIN_DAYS_FOR_STATS in src/lib/stats/aggregate.ts (background scripts are not bundled). */
export const STATS_READY_DAYS = 3;

/**
 * @returns {Promise<{handled: boolean}>} Whether the note was already answered or made moot.
 */
export async function getStatsPromptState() {
  try {
    const data = await browser.storage.local.get(STATS_PROMPT_KEY);
    return { handled: data[STATS_PROMPT_KEY]?.handled === true };
  } catch (error) {
    console.error('[StatsPrompt] Error reading state:', error);
    return { handled: true };
  }
}

/**
 * Whether the popup should show the note now.
 *
 * @param {number} trackedDays - From `trackedDayCount`.
 * @returns {Promise<boolean>}
 */
export async function shouldShowStatsPrompt(trackedDays) {
  if (trackedDays < STATS_READY_DAYS) return false;
  const { handled } = await getStatsPromptState();
  return !handled;
}

/**
 * Retires the note for good.
 *
 * @returns {Promise<void>}
 */
export async function markStatsPromptHandled() {
  try {
    const { handled } = await getStatsPromptState();
    if (handled) return;
    await browser.storage.local.set({ [STATS_PROMPT_KEY]: { handled: true, handledAt: Date.now() } });
  } catch (error) {
    console.error('[StatsPrompt] Error saving state:', error);
  }
}

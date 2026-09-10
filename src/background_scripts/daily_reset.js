/**
 * @file daily_reset.js
 * @description Manages the daily reset functionality for site usage statistics.
 * This module provides functions to initialize the daily reset alarm and perform
 * the actual reset operation. The alarm listener is now handled by background.js
 * as part of the event-driven architecture.
 */

import { getWindowDates, pruneOldVisits } from './visit_tracker.js';


// Name for the daily reset alarm - updated to match background.js
const DAILY_USAGE_RESET_ALARM_NAME = 'dailyResetAlarm';

/**
 * Returns the current date as a string in "YYYY-MM-DD" format.
 * Used for daily-scoped storage keys like usageStats-YYYY-MM-DD and extensions-YYYY-MM-DD.
 *
 * @returns {string} The formatted date string (YYYY-MM-DD).
 */
export function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the timestamp for the next occurrence of midnight.
 * This is used to schedule the alarm's first run.
 *
 * @returns {number} The timestamp (milliseconds since epoch) for the next midnight.
 */
function getNextMidnight() {
  const now = new Date();
  // Create a date object for today, then advance to tomorrow
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );
  // Set time to 00:00:00 for the start of tomorrow
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Initializes the daily reset alarm.
 * This function creates a WebExtension alarm that is scheduled to fire at the next
 * midnight and then periodically every 24 hours.
 * It should be called once, typically from the background script on extension startup.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If alarm creation fails
 */
export async function initializeDailyResetAlarm() {
  try {
    const nextRunTime = getNextMidnight();
    await browser.alarms.create(DAILY_USAGE_RESET_ALARM_NAME, {
      when: nextRunTime,
      periodInMinutes: 24 * 60, // Every 24 hours
    });

    // Warn if the alarm could not be read back after scheduling
    const alarm = await browser.alarms.get(DAILY_USAGE_RESET_ALARM_NAME);
    if (!alarm) {
      console.warn(
        `[DailyReset] Alarm "${DAILY_USAGE_RESET_ALARM_NAME}" was scheduled, but could not be retrieved immediately for logging its scheduled time. Intended first run was for: ${new Date(nextRunTime).toLocaleString()}`
      );
    }
  } catch (error) {
    console.error(
      '[DailyReset] Error creating/updating daily reset alarm:',
      error
    );
    throw error;
  }
}

/**
 * Performs the daily reset of usage statistics.
 * This function clears all usage data that is older than the current day,
 * effectively resetting daily usage tracking. It preserves the current day's
 * data if any exists.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If reset operation fails
 */
export async function performDailyReset() {
  // Local date, so the day being preserved matches the daily storage keys
  // written by usage_recorder/site_blocker.
  const currentDateString = getCurrentDateString();


  try {
    // Get all storage keys to find usage statistics and extensions
    const allStorage = await browser.storage.local.get(null);
    const usageStatsKeys = Object.keys(allStorage).filter((key) =>
      key.startsWith('usageStats-')
    );
    const extensionKeys = Object.keys(allStorage).filter((key) =>
      key.startsWith('extensions-')
    );

    // Identify usage stat keys that are not for today
    const usageKeysToRemove = usageStatsKeys.filter((key) => {
      const dateFromKey = key.replace('usageStats-', '');
      return dateFromKey !== currentDateString;
    });

    if (usageKeysToRemove.length > 0) {
      await browser.storage.local.remove(usageKeysToRemove);
    }

    // Identify extension keys that are not for today
    const extensionKeysToRemove = extensionKeys.filter((key) => {
      const dateFromKey = key.replace('extensions-', '');
      return dateFromKey !== currentDateString;
    });

    if (extensionKeysToRemove.length > 0) {
      await browser.storage.local.remove(extensionKeysToRemove);
    }

    // Reflection answers are kept for the same rolling window as visit counts,
    // because they are the raw material of the statistics page rather than a
    // per-day allowance.
    const keptDates = new Set(getWindowDates(currentDateString));
    const reflectionKeysToRemove = Object.keys(allStorage)
      .filter((key) => key.startsWith('reflections-'))
      .filter((key) => !keptDates.has(key.replace('reflections-', '')));

    if (reflectionKeysToRemove.length > 0) {
      await browser.storage.local.remove(reflectionKeysToRemove);
    }

    // Passes are short-lived by design; none of yesterday's can still be valid.
    await browser.storage.local.remove('reflectionPasses');

    await pruneOldVisits(currentDateString);

  } catch (error) {
    console.error('[DailyReset] Error during daily reset:', error);
    throw error;
  }
}

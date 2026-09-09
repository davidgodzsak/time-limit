/**
 * @file distraction_detector.js
 * @description Manages the list of distracting sites and groups, providing functions
 * to check if a given URL is considered distracting.
 * It loads distracting sites and groups from storage and keeps the lists updated if changes occur.
 *
 * Matching (host, subdomain and path rules, plus which pattern wins when
 * several apply) lives in url_matcher.js.
 */

import { getDistractingSites } from './site_storage.js';
import { findMatchingSite } from './url_matcher.js';

let _distractingSitesCache = [];
let _isInitialized = false;
let _onSitesReloadedCallback = null; // Callback for when sites/groups are reloaded

/**
 * Loads distracting sites and groups from storage and updates the local caches.
 * @returns {Promise<void>}
 */
export async function loadDistractingSitesFromStorage() {
  try {
    const sites = await getDistractingSites();
    _distractingSitesCache = sites && Array.isArray(sites) ? sites : [];
    if (_onSitesReloadedCallback) {
      _onSitesReloadedCallback();
    }
  } catch (error) {
    console.error(
      '[DistractionDetector] Error loading distracting sites from storage:',
      error
    );
    _distractingSitesCache = []; // Ensure cache is an array even on error
  }
}

/**
 * Handles changes in browser storage.
 * If `distractingSites` or `groups` are changed, reloads them into the cache.
 * @param {Object} changes - The changes object from browser.storage.onChanged.
 * @param {string} areaName - The storage area name (e.g., "local", "sync").
 */
async function _handleStorageChange(changes, areaName) {
  if (areaName === 'local' && (changes.distractingSites || changes.groups)) {
    await loadDistractingSitesFromStorage();
  }
}

/**
 * Initializes the distraction detector.
 * Loads the initial list of distracting sites and sets up a listener for storage changes.
 * @param {Function} [onSitesReloaded] Optional callback to be invoked when sites are reloaded due to storage changes.
 * @returns {Promise<void>}
 */
export async function initializeDistractionDetector(onSitesReloaded) {
  if (_isInitialized) {
    console.warn('[DistractionDetector] Already initialized.');
    return;
  }
  if (onSitesReloaded) {
    _onSitesReloadedCallback = onSitesReloaded;
  }
  await loadDistractingSitesFromStorage();
  browser.storage.onChanged.addListener(_handleStorageChange);
  _isInitialized = true;
}

/**
 * Checks if the given URL matches any enabled distracting site.
 * When several patterns match, the most specific one wins, so a
 * `youtube.com/shorts` limit takes precedence over a plain `youtube.com` limit.
 *
 * @param {string} url - The URL to check.
 * @returns {{isMatch: boolean, siteId: string|null, groupId: string|null, matchingPattern: string|null}}
 *           Object indicating if it's a match, the ID of the matched site, the ID of its group (if any),
 *           and the pattern that matched.
 */
export function checkIfUrlIsDistracting(url) {
  if (!_isInitialized) {
    console.warn(
      '[DistractionDetector] Detector not initialized. Call initializeDistractionDetector first.'
    );
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null };
  }

  const site = findMatchingSite(
    url,
    _distractingSitesCache,
    (candidate) => candidate.isEnabled !== false
  );

  if (!site) {
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null };
  }

  return {
    isMatch: true,
    siteId: site.id,
    groupId: site.groupId || null, // Include groupId if site belongs to a group
    matchingPattern: site.urlPattern,
  };
}

/**
 * Checks if a URL has ANY limits (enabled or disabled).
 * Used by the popup to show "turn on" for disabled sites instead of "add new".
 *
 * @param {string} url - The URL to check.
 * @returns {object} { isMatch: boolean, siteId: string|null, groupId: string|null, matchingPattern: string|null, isEnabled: boolean|null }
 */
export function checkIfUrlHasLimits(url) {
  if (!_isInitialized) {
    console.warn(
      '[DistractionDetector] Detector not initialized. Call initializeDistractionDetector first.'
    );
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null, isEnabled: null };
  }

  const site = findMatchingSite(url, _distractingSitesCache);

  if (!site) {
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null, isEnabled: null };
  }

  return {
    isMatch: true,
    siteId: site.id,
    groupId: site.groupId || null,
    matchingPattern: site.urlPattern,
    isEnabled: site.isEnabled !== false,
  };
}

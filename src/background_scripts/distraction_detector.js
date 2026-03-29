/**
 * @file distraction_detector.js
 * @description Manages the list of distracting sites and groups, providing functions
 * to check if a given URL is considered distracting based on hostname matching.
 * It loads distracting sites and groups from storage and keeps the lists updated if changes occur.
 */

import { getDistractingSites } from './site_storage.js';
import { getGroups } from './group_storage.js';

let _distractingSitesCache = [];
let _groupsCache = [];
let _isInitialized = false;
let _onSitesReloadedCallback = null; // Callback for when sites/groups are reloaded

/**
 * Extracts the hostname from a given URL string.
 * @private
 * @param {string} urlString - The URL to parse.
 * @returns {string|null} The hostname, or null if the URL is invalid or not http/https.
 */
function _getHostnameFromUrl(urlString) {
  try {
    if (
      !urlString ||
      (!urlString.startsWith('http:') && !urlString.startsWith('https:'))
    ) {
      return null;
    }
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    // Log quietly as this can happen with temporary/internal URLs
    return null;
  }
}

/**
 * Loads distracting sites and groups from storage and updates the local caches.
 * @returns {Promise<void>}
 */
export async function loadDistractingSitesFromStorage() {
  try {
    const [sites, groups] = await Promise.all([
      getDistractingSites(),
      getGroups(),
    ]);
    _distractingSitesCache = sites && Array.isArray(sites) ? sites : [];
    _groupsCache = groups && Array.isArray(groups) ? groups : [];
    console.log(
      '[DistractionDetector] Distracting sites cache reloaded:',
      _distractingSitesCache
    );
    console.log(
      '[DistractionDetector] Groups cache reloaded:',
      _groupsCache
    );
    if (_onSitesReloadedCallback) {
      _onSitesReloadedCallback();
    }
  } catch (error) {
    console.error(
      '[DistractionDetector] Error loading distracting sites/groups from storage:',
      error
    );
    _distractingSitesCache = []; // Ensure cache is an array even on error
    _groupsCache = [];
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
    if (changes.distractingSites) {
      console.log(
        '[DistractionDetector] Detected change in distractingSites in storage. Reloading cache...'
      );
    }
    if (changes.groups) {
      console.log(
        '[DistractionDetector] Detected change in groups in storage. Reloading cache...'
      );
    }
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
  console.log('[DistractionDetector] Initializing...');
  if (onSitesReloaded) {
    _onSitesReloadedCallback = onSitesReloaded;
  }
  await loadDistractingSitesFromStorage();
  browser.storage.onChanged.addListener(_handleStorageChange);
  _isInitialized = true;
  console.log('[DistractionDetector] Initialization complete.');
}

/**
 * Checks if the given URL matches any of the cached distracting sites or groups based on hostname.
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
  const currentHostname = _getHostnameFromUrl(url);
  if (!currentHostname) {
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null };
  }

  for (const site of _distractingSitesCache) {
    // Ensure site.urlPattern exists and is a string before attempting to match
    if (site.urlPattern && typeof site.urlPattern === 'string') {
      // Match if exact match OR if it's a valid subdomain match (with dot boundary)
      // 'example.com' matches 'example.com' and 'sub.example.com' but not 'myexample.com'
      if (
        (currentHostname === site.urlPattern ||
          currentHostname.endsWith('.' + site.urlPattern)) &&
        site.isEnabled !== false
      ) {
        return {
          isMatch: true,
          siteId: site.id,
          groupId: site.groupId || null, // Include groupId if site belongs to a group
          matchingPattern: site.urlPattern,
        };
      }
    }
  }
  return { isMatch: false, siteId: null, groupId: null, matchingPattern: null };
}

/**
 * Checks if a URL has ANY limits (enabled or disabled).
 * Used by the popup to show "turn on" for disabled sites instead of "add new".
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
  const currentHostname = _getHostnameFromUrl(url);
  if (!currentHostname) {
    return { isMatch: false, siteId: null, groupId: null, matchingPattern: null, isEnabled: null };
  }

  for (const site of _distractingSitesCache) {
    // Ensure site.urlPattern exists and is a string before attempting to match
    if (site.urlPattern && typeof site.urlPattern === 'string') {
      // Match if exact match OR if it's a valid subdomain match (with dot boundary)
      // 'example.com' matches 'example.com' and 'sub.example.com' but not 'myexample.com'
      if (
        currentHostname === site.urlPattern ||
        currentHostname.endsWith('.' + site.urlPattern)
      ) {
        return {
          isMatch: true,
          siteId: site.id,
          groupId: site.groupId || null,
          matchingPattern: site.urlPattern,
          isEnabled: site.isEnabled !== false,
        };
      }
    }
  }
  return { isMatch: false, siteId: null, groupId: null, matchingPattern: null, isEnabled: null };
}

/**
 * @file storage.ts
 * @description Schema conversion between UI and background script storage formats.
 * Handles conversion between:
 * - UI format: minutes for time limits, "name" field for URLs
 * - Backend format: seconds for time limits, "urlPattern" field for URLs
 */

/**
 * Backend Site type from storage
 */
export interface BackendSite {
  id?: string;
  urlPattern: string;
  dailyLimitSeconds?: number;
  dailyOpenLimit?: number;
  isEnabled?: boolean;
  groupId?: string;
}

/**
 * UI Site type for React components
 */
export interface UISite {
  id: string;
  name: string;
  favicon?: string;
  timeLimit?: number;
  opensLimit?: number;
  isEnabled?: boolean;
  groupId?: string;
}

/**
 * Backend Group type from storage
 */
export interface BackendGroup {
  id: string;
  name: string;
  color: string;
  dailyLimitSeconds: number;
  dailyOpenLimit?: number;
  isEnabled: boolean;
  siteIds: string[];
}

/**
 * UI Group type for React components
 */
export interface UIGroup {
  id: string;
  name: string;
  color: string;
  timeLimit: number;
  opensLimit?: number;
  sites: UISite[];
  isEnabled?: boolean;
  expanded?: boolean;
}

/**
 * Message type for motivational timeout notes
 */
export interface Message {
  id: string;
  text: string;
}

/**
 * Converts a backend site to UI format.
 * Converts:
 * - dailyLimitSeconds -> timeLimit (in minutes)
 * - dailyOpenLimit -> opensLimit
 * - urlPattern -> name
 */
export function siteFromStorage(
  storageSite: BackendSite,
  faviconMap?: Record<string, string>
): UISite {
  const site: UISite = {
    id: storageSite.id || '',
    name: storageSite.urlPattern,
    isEnabled: storageSite.isEnabled,
  };

  // Convert seconds to minutes and round
  if (storageSite.dailyLimitSeconds) {
    site.timeLimit = Math.ceil(storageSite.dailyLimitSeconds / 60);
  }

  // Add opensLimit if present
  if (storageSite.dailyOpenLimit) {
    site.opensLimit = storageSite.dailyOpenLimit;
  }

  // Add groupId if present
  if (storageSite.groupId) {
    site.groupId = storageSite.groupId;
  }

  // Add favicon emoji
  site.favicon = faviconMap?.[storageSite.urlPattern] || '🌐';

  return site;
}

/**
 * Converts a UI site to backend format.
 * Converts:
 * - timeLimit (in minutes) -> dailyLimitSeconds
 * - opensLimit -> dailyOpenLimit
 * - name -> urlPattern
 */
export function siteToStorage(uiSite: UISite): BackendSite {
  const storageSite: BackendSite = {
    urlPattern: uiSite.name,
  };

  // Only include id if it exists
  if (uiSite.id) {
    storageSite.id = uiSite.id;
  }

  // Convert time limit (minutes to seconds, only if provided)
  if (uiSite.timeLimit && uiSite.timeLimit > 0) {
    storageSite.dailyLimitSeconds = uiSite.timeLimit * 60;
  }

  // Add opensLimit if present
  if (uiSite.opensLimit && uiSite.opensLimit > 0) {
    storageSite.dailyOpenLimit = uiSite.opensLimit;
  }

  // Add enabled status if explicitly set
  if (uiSite.isEnabled !== undefined) {
    storageSite.isEnabled = uiSite.isEnabled;
  }

  // Add groupId if present
  if (uiSite.groupId) {
    storageSite.groupId = uiSite.groupId;
  }

  return storageSite;
}

/**
 * Converts a backend group to UI format.
 * Converts:
 * - dailyLimitSeconds -> timeLimit (in minutes)
 * - dailyOpenLimit -> opensLimit
 * - Includes converted site data
 */
export function groupFromStorage(
  storageGroup: BackendGroup,
  sitesMap: Map<string, BackendSite>,
  faviconMap?: Record<string, string>
): UIGroup {
  const siteIds = storageGroup.siteIds || [];
  const sites: UISite[] = siteIds
    .map((siteId) => sitesMap.get(siteId))
    .filter((site): site is BackendSite => site !== undefined)
    .map((site) => siteFromStorage(site, faviconMap));

  const group: UIGroup = {
    id: storageGroup.id,
    name: storageGroup.name,
    color: storageGroup.color,
    timeLimit: Math.ceil(storageGroup.dailyLimitSeconds / 60),
    sites,
    isEnabled: storageGroup.isEnabled,
  };

  if (storageGroup.dailyOpenLimit) {
    group.opensLimit = storageGroup.dailyOpenLimit;
  }

  return group;
}

/**
 * Converts a UI group to backend format.
 * Note: Does not convert sites - that's handled separately via addSiteToGroup
 * Converts:
 * - timeLimit (in minutes) -> dailyLimitSeconds
 * - opensLimit -> dailyOpenLimit
 */
export function groupToStorage(uiGroup: UIGroup): BackendGroup {
  const storageGroup: BackendGroup = {
    id: uiGroup.id,
    name: uiGroup.name,
    color: uiGroup.color,
    dailyLimitSeconds: uiGroup.timeLimit * 60,
    isEnabled: uiGroup.isEnabled !== false,
    siteIds: uiGroup.sites?.map((s) => s.id) || [],
  };

  if (uiGroup.opensLimit) {
    storageGroup.dailyOpenLimit = uiGroup.opensLimit;
  }

  return storageGroup;
}

/**
 * Creates a default favicon map for common sites
 */
export const getDefaultFaviconMap = (): Record<string, string> => ({
  'facebook.com': '📘',
  'instagram.com': '📸',
  'twitter.com': '🐦',
  'reddit.com': '🤖',
  'youtube.com': '▶️',
  'netflix.com': '🎬',
  'twitch.tv': '💜',
  'tiktok.com': '🎵',
  'linkedin.com': '💼',
  'pinterest.com': '📌',
  'snapchat.com': '👻',
  'news.ycombinator.com': '🟧',
});

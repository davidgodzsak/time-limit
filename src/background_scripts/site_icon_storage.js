/**
 * @file site_icon_storage.js
 * @description Remembers the icon each limited site showed in its tab, so the
 * settings, popup, timeout and reflection pages can draw it without asking the
 * network.
 *
 * Only Firefox needs this. Chromium keeps its own favicon cache and lets
 * extension pages read it through `_favicon/` (the `favicon` permission, added
 * to the Chrome manifest only), so there is nothing to record there.
 *
 * What is kept, and why it stays small:
 * - One entry per rule host (`instagram.com`, `shorts.youtube.com`), never per
 *   visited page, and only for hosts that have a rule. It is not a history.
 * - The icon URL the tab reported. A `data:` icon is kept as is when it is
 *   small; a remote one is kept as its URL and the browser's HTTP cache holds
 *   the bytes.
 * - Written only when the icon changed, and pruned of hosts that lost their
 *   rule on every background startup.
 */

import { parseUrlPattern } from './url_matcher.js';

export const SITE_ICONS_KEY = 'siteIcons';

/** Big inline icons are skipped: the remote fallback does the job without bloating storage. */
export const MAX_DATA_URL_LENGTH = 16 * 1024;

/**
 * Whether the extension runs in Firefox, the only browser that needs recording.
 * Same check as the rating link: only Firefox serves `moz-extension://`.
 */
export function needsIconRecording() {
  try {
    return browser.runtime.getURL('').startsWith('moz-extension://');
  } catch {
    return false;
  }
}

/**
 * An icon URL worth keeping: a remote http(s) image, or a small inline one.
 * Browser-internal icons (`chrome://`, `moz-extension://`) would not load in
 * an extension page anyway.
 *
 * @param {string|undefined} url
 * @returns {boolean}
 */
export function isRecordableIconUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  if (url.startsWith('data:image/')) return url.length <= MAX_DATA_URL_LENGTH;
  return url.startsWith('https://') || url.startsWith('http://');
}

/** The host an icon is stored under: the host part of the rule's pattern. */
export function iconHostForPattern(pattern) {
  return parseUrlPattern(pattern)?.host ?? null;
}

async function _readIcons() {
  const result = await browser.storage.local.get(SITE_ICONS_KEY);
  const icons = result[SITE_ICONS_KEY];
  return icons && typeof icons === 'object' ? icons : {};
}

/**
 * Stores the icon a tab showed for the rule it matched.
 *
 * @param {string} pattern - The matching rule's URL pattern.
 * @param {string} iconUrl - The tab's `favIconUrl`.
 * @returns {Promise<boolean>} True when storage was written.
 */
export async function recordSiteIcon(pattern, iconUrl) {
  if (!isRecordableIconUrl(iconUrl)) return false;
  const host = iconHostForPattern(pattern);
  if (!host) return false;

  const icons = await _readIcons();
  if (icons[host] === iconUrl) return false;

  await browser.storage.local.set({
    [SITE_ICONS_KEY]: { ...icons, [host]: iconUrl },
  });
  return true;
}

/**
 * Drops icons for hosts no rule uses any more.
 *
 * @param {Array<{urlPattern: string}>} sites - Every stored site, grouped or not.
 * @returns {Promise<number>} How many entries were removed.
 */
export async function pruneSiteIcons(sites) {
  const icons = await _readIcons();
  const hosts = Object.keys(icons);
  if (hosts.length === 0) return 0;

  const kept = new Set(
    (sites || []).map((site) => iconHostForPattern(site.urlPattern)).filter(Boolean)
  );
  const stale = hosts.filter((host) => !kept.has(host));
  if (stale.length === 0) return 0;

  const next = { ...icons };
  for (const host of stale) delete next[host];
  await browser.storage.local.set({ [SITE_ICONS_KEY]: next });
  return stale.length;
}

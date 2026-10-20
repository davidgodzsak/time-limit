/**
 * @file open_counter.js
 * @description Decides what counts as "opening" a limited site, for the daily
 * opens limit.
 *
 * An open is what the user is looking at moving onto a rule from something
 * else — by navigating (a link, typing the address, coming back from the
 * timeout or reflection page), by switching to a tab or window that already
 * shows it, or by coming back to the browser from another app. Instagram →
 * Facebook → Instagram is two Instagram opens even when both are tabs that
 * stay open, and so is Instagram → Slack → Instagram; otherwise one tab left
 * open could be returned to without limit. Instagram tab → another Instagram
 * tab is not an open, and neither is clicking around inside the site
 * (Instagram changes its URL for every story), a reload, or tabs loading in
 * the background.
 *
 * Opens used to be counted by the time tracker, once every time it started —
 * and it restarts on every focus change and, through a bug in the tab update
 * handler, whenever any background tab changed its URL. A five-open limit could
 * run out within minutes of browsing one site (GitHub issue #9).
 *
 * The rule in view is kept under `viewedSiteId`, and cleared on browser
 * startup so a restored tab counts as opened again. When the browser loses
 * focus the time is kept under `leftBrowserAt`.
 */

import { getDistractingSites } from './site_storage.js';
import { findMatchingSite } from './url_matcher.js';
import { recordSiteOpen } from './usage_recorder.js';

const VIEWED_SITE_KEY = 'viewedSiteId';
const LEFT_BROWSER_KEY = 'leftBrowserAt';

// Some platforms report "no window focused" for a moment while focus moves
// between two browser windows. An absence shorter than this is that flicker,
// not the user leaving.
export const FOCUS_FLICKER_MS = 1000;

// A tab switch and a URL change can land together (a link opening in a new
// tab, a single-page app replacing its URL right after load), and two of them
// racing the same read-modify-write would both see "arriving" and count the
// open twice. One at a time.
let _queue = Promise.resolve();

function _serialize(task) {
  const run = _queue.then(task);
  _queue = run.catch(() => {});
  return run;
}

async function _getViewedSiteId() {
  const result = await browser.storage.local.get(VIEWED_SITE_KEY);
  return result[VIEWED_SITE_KEY] || null;
}

async function _setViewedSiteId(previous, siteId) {
  if (previous === siteId) return;
  await browser.storage.local.set({ [VIEWED_SITE_KEY]: siteId });
}

async function _siteIdFor(url) {
  const sites = await getDistractingSites();
  const site = findMatchingSite(
    url,
    sites,
    (candidate) => candidate.isEnabled !== false
  );
  return site ? site.id : null;
}

/**
 * Whether the view moving from one rule to another is opening a site.
 * @param {string|null|undefined} previousSiteId - The rule that was in view.
 * @param {string|null} siteId - The rule of the page now in view.
 * @returns {boolean}
 */
export function isNewOpen(previousSiteId, siteId) {
  return !!siteId && previousSiteId !== siteId;
}

/**
 * Would bringing `url` into view open a site? Read-only: `onBeforeNavigate`
 * asks this for the tab in front, to decide whether the opens limit applies to
 * the navigation at all.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function wouldOpenSite(url) {
  const [siteId, viewed] = await Promise.all([
    _siteIdFor(url),
    _getViewedSiteId(),
  ]);
  return isNewOpen(viewed, siteId);
}

/**
 * Records that the user is now looking at `url`, and counts an open when that
 * moves the view onto a rule from something else.
 *
 * @param {string} url
 * @param {Object} [options]
 * @param {(url: string) => Promise<boolean>} [options.allowOpen] - Asked before
 *   an open is counted. `false` means the caller turned the tab away (to the
 *   timeout page), so nothing is counted and the site counts as left.
 * @returns {Promise<{siteId: string|null, counted: boolean, refused: boolean}>}
 */
export function recordView(url, { allowOpen } = {}) {
  return _serialize(async () => {
    const [siteId, viewed] = await Promise.all([
      _siteIdFor(url),
      _getViewedSiteId(),
    ]);

    if (!isNewOpen(viewed, siteId)) {
      await _setViewedSiteId(viewed, siteId);
      return { siteId, counted: false, refused: false };
    }

    if (allowOpen && !(await allowOpen(url))) {
      await _setViewedSiteId(viewed, null);
      return { siteId, counted: false, refused: true };
    }

    await recordSiteOpen(siteId);
    await _setViewedSiteId(viewed, siteId);
    return { siteId, counted: true, refused: false };
  });
}

/**
 * Forgets what is in view, so the next limited page counts as an open. For the
 * tab in front being sent to the timeout or reflection page, and startup.
 */
export function forgetView() {
  return _serialize(async () => {
    await _setViewedSiteId(await _getViewedSiteId(), null);
  });
}

/**
 * Notes that the browser lost focus — the user went to another app.
 * @param {number} [now=Date.now()]
 */
export function noteBrowserLeft(now = Date.now()) {
  return _serialize(() =>
    browser.storage.local.set({ [LEFT_BROWSER_KEY]: now })
  );
}

/**
 * Notes that the browser has focus again. After a real absence the view is
 * forgotten, so whatever limited site is in front counts as opened again;
 * a momentary flicker between two browser windows changes nothing.
 * @param {number} [now=Date.now()]
 */
export function noteBrowserReturned(now = Date.now()) {
  return _serialize(async () => {
    const result = await browser.storage.local.get(LEFT_BROWSER_KEY);
    const leftAt = result[LEFT_BROWSER_KEY];
    if (!leftAt) return;

    await browser.storage.local.set({ [LEFT_BROWSER_KEY]: null });
    if (now - leftAt > FOCUS_FLICKER_MS) {
      await _setViewedSiteId(await _getViewedSiteId(), null);
    }
  });
}

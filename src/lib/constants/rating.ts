const RATING_URLS = {
  firefox: 'https://addons.mozilla.org/firefox/addon/time-limit-extension/reviews/',
  chrome: 'https://chromewebstore.google.com/detail/mindful-browse/fhlebfafkdeiclbanmjjojjijdgllbbf/reviews',
};

/**
 * The store page to review the extension on, decided by the browser it runs in.
 *
 * This has to be a runtime check: CI builds once and ships the same bundle to
 * both stores, so a build-time flag sent Chrome, Brave and Edge users to the
 * Firefox store (issue #33). Every Chromium browser installs from the Chrome
 * Web Store, and only Firefox serves extension pages from `moz-extension://`.
 */
export function getRatingUrl(): string {
  const isFirefox = browser.runtime.getURL('').startsWith('moz-extension://');
  return isFirefox ? RATING_URLS.firefox : RATING_URLS.chrome;
}

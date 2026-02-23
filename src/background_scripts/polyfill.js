/**
 * Browser API Polyfill
 * Makes Chrome's `chrome` API available as `browser` for Firefox compatibility
 */
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  globalThis.browser = chrome;
}

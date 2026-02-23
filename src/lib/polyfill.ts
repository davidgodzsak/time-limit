/**
 * Browser API Polyfill
 * Makes Chrome's `chrome` API available as `browser` for Firefox compatibility
 */
if (typeof globalThis.browser === 'undefined' && typeof globalThis.chrome !== 'undefined') {
  globalThis.browser = globalThis.chrome;
}

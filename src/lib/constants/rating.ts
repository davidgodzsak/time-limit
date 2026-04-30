declare const __BROWSER_TARGET__: string;

const RATING_URLS: Record<string, string> = {
  firefox: 'https://addons.mozilla.org/firefox/addon/time-limit-extension/reviews/',
  chrome: 'https://chromewebstore.google.com/detail/mindful-browse/fhlebfafkdeiclbanmjjojjijdgllbbf/reviews',
};

export function getRatingUrl(): string {
  return RATING_URLS[__BROWSER_TARGET__] ?? RATING_URLS.firefox;
}

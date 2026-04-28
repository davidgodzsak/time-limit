declare const __BROWSER_TARGET__: string;

const RATING_URLS: Record<string, string> = {
  firefox: 'https://addons.mozilla.org/firefox/addon/time-limit/reviews/',
  chrome: 'https://chromewebstore.google.com/detail/time-limit/fhlebfafkdeiclbanmjjojjijdgllbbf/reviews',
};

export function getRatingUrl(): string {
  return RATING_URLS[__BROWSER_TARGET__] ?? RATING_URLS.firefox;
}

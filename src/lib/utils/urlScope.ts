/**
 * Helper for turning the current tab's URL into the pattern a quick limit from
 * the popup is stored under.
 *
 * The patterns produced here match the format the background stores
 * (see background_scripts/url_matcher.js): lowercase `host` or `host/path`,
 * without protocol or a leading `www.`.
 */

/**
 * The whole-site pattern for a URL, e.g. `youtube.com` for
 * `https://www.youtube.com/shorts/abc`.
 */
export function getSitePattern(url: string): string | null {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

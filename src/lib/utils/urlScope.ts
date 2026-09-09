/**
 * Helpers for deciding what a quick limit added from the popup should cover:
 * the whole site, or just the section of it the user is currently in.
 *
 * The patterns produced here match the format the background stores
 * (see background_scripts/url_matcher.js): lowercase `host` or `host/path`,
 * without protocol or a leading `www.`.
 */

/** Sections that only ever hold one page, so a "this section" limit is pointless. */
const IGNORED_SEGMENTS = new Set(['index.html', 'index.htm', 'index.php']);

/**
 * Some sites route through a one- or two-letter segment that says nothing on its
 * own — reddit.com/r/<subreddit>, reddit.com/u/<user>, youtube.com/c/<channel>.
 * For those the useful section is one level deeper.
 */
const MAX_ROUTING_SEGMENT_LENGTH = 2;

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

/**
 * The section pattern for a URL — the site plus its first path segment, e.g.
 * `youtube.com/shorts` for `https://www.youtube.com/shorts/abc`. Short routing
 * segments take the next one along too, so a subreddit becomes
 * `reddit.com/r/hungary` rather than the meaningless `reddit.com/r`.
 * Returns null when the URL has no path to narrow down to.
 */
export function getSectionPattern(url: string): string | null {
  const site = getSitePattern(url);
  if (!site) return null;

  try {
    const { pathname } = new URL(url);
    const segments = pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => segment.toLowerCase());

    if (segments.length === 0) return null;
    if (IGNORED_SEGMENTS.has(segments[0])) return null;

    const kept =
      segments[0].length <= MAX_ROUTING_SEGMENT_LENGTH && segments[1]
        ? segments.slice(0, 2)
        : segments.slice(0, 1);

    return `${site}/${kept.join('/')}`;
  } catch {
    return null;
  }
}

/**
 * @file url_matcher.js
 * @description Single source of truth for turning user input into a stored URL
 * pattern and for deciding whether a browsed URL matches such a pattern.
 *
 * A pattern is a normalized `host` or `host/path` string, e.g. `youtube.com`,
 * `shorts.youtube.com` or `youtube.com/shorts`. Matching rules:
 *
 * - Host: exact match, or a subdomain of the pattern host. `youtube.com`
 *   matches `youtube.com` and `www.youtube.com`, but not `notyoutube.com`.
 * - Path: when the pattern has one, the URL path must equal it or be nested
 *   under it on a segment boundary. `youtube.com/shorts` matches
 *   `/shorts` and `/shorts/abc`, but not `/shortsomething` or `/watch`.
 *
 * When several patterns match the same URL, the most specific one wins
 * (deeper path first, then longer host) — see `patternSpecificity`.
 */

/** Path characters allowed in a pattern (RFC 3986 pchar, plus `/`). */
const PATH_CHARS = /^[a-z0-9\-._~%!$&'()*+,;=:@/]*$/;

/** Hostname labels: letters, digits, dots and dashes, ending alphanumeric. */
const HOSTNAME = /^[a-z0-9.-]+[a-z0-9]$/;

/** Protocols we refuse to store as patterns. */
const RESTRICTED_PROTOCOLS = [
  'javascript:',
  'data:',
  'file:',
  'chrome:',
  'moz-extension:',
  'chrome-extension:',
  'about:',
];

/**
 * Normalizes raw user input into a canonical pattern.
 * Strips protocol, `www.`, query, hash and redundant slashes, and lowercases
 * everything so that `HTTPS://www.YouTube.com/Shorts/?t=1` and `youtube.com/shorts`
 * both become `youtube.com/shorts`.
 *
 * @param {string} input - Raw pattern as typed by the user.
 * @returns {string|null} The normalized pattern, or null if it cannot be normalized.
 */
export function normalizeUrlPattern(input) {
  if (!input || typeof input !== 'string') return null;

  let value = input.trim().toLowerCase();
  if (value === '') return null;

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.split('#')[0].split('?')[0];
  value = value.replace(/^www\./, '');
  value = value.replace(/\/{2,}/g, '/').replace(/\/+$/, '');

  if (value === '') return null;
  return value;
}

/**
 * Splits a normalized pattern into its host and path parts.
 *
 * @param {string} pattern - A pattern, normalized or not.
 * @returns {{host: string, path: string, segments: string[]}|null}
 *          `path` is '' for host-only patterns, otherwise starts with '/'.
 */
export function parseUrlPattern(pattern) {
  const normalized = normalizeUrlPattern(pattern);
  if (!normalized) return null;

  const slash = normalized.indexOf('/');
  const host = slash === -1 ? normalized : normalized.slice(0, slash);
  const path = slash === -1 ? '' : normalized.slice(slash);

  if (!host) return null;

  return {
    host,
    path,
    segments: path === '' ? [] : path.slice(1).split('/').filter(Boolean),
  };
}

/**
 * Validates a normalized pattern's shape (hostname syntax, allowed path characters).
 *
 * @param {string} pattern - The pattern to check.
 * @returns {boolean} True when the pattern is structurally usable.
 */
export function isValidUrlPattern(pattern) {
  const parsed = parseUrlPattern(pattern);
  if (!parsed) return false;
  if (!HOSTNAME.test(parsed.host)) return false;
  if (parsed.host.includes('..')) return false;
  if (parsed.path && !PATH_CHARS.test(parsed.path)) return false;
  return true;
}

/**
 * Reports whether raw input names a protocol we refuse to limit.
 *
 * @param {string} input - Raw pattern as typed by the user.
 * @returns {boolean} True when the input references a restricted protocol.
 */
export function hasRestrictedProtocol(input) {
  if (!input || typeof input !== 'string') return false;
  const lower = input.toLowerCase();
  return RESTRICTED_PROTOCOLS.some((protocol) => lower.includes(protocol));
}

/**
 * Extracts the parts of a browsed URL used for matching.
 *
 * @private
 * @param {string} urlString - The URL to parse.
 * @returns {{host: string, path: string}|null} Null for non-http(s) or unparseable URLs.
 */
function _parseUrl(urlString) {
  if (
    !urlString ||
    typeof urlString !== 'string' ||
    (!urlString.startsWith('http:') && !urlString.startsWith('https:'))
  ) {
    return null;
  }
  try {
    const url = new URL(urlString);
    return {
      host: url.hostname.toLowerCase(),
      path: url.pathname.toLowerCase().replace(/\/+$/, '') || '/',
    };
  } catch {
    // Temporary and internal URLs land here; not a match, not an error.
    return null;
  }
}

/**
 * Checks whether a browsed URL matches a stored pattern.
 *
 * @param {string} urlString - The URL being visited.
 * @param {string} pattern - The stored pattern to test against.
 * @returns {boolean} True when the URL falls under the pattern.
 */
export function urlMatchesPattern(urlString, pattern) {
  const url = _parseUrl(urlString);
  const parsed = parseUrlPattern(pattern);
  if (!url || !parsed) return false;

  const hostMatches =
    url.host === parsed.host || url.host.endsWith('.' + parsed.host);
  if (!hostMatches) return false;

  if (parsed.path === '') return true;

  const patternPath = parsed.path.replace(/\/+$/, '');
  return url.path === patternPath || url.path.startsWith(patternPath + '/');
}

/**
 * Scores how specific a pattern is, so the narrowest limit wins when several apply.
 * Path depth dominates; a longer host breaks ties (`shorts.youtube.com` beats `youtube.com`).
 *
 * @param {string} pattern - The pattern to score.
 * @returns {number} Higher means more specific; 0 for unusable patterns.
 */
export function patternSpecificity(pattern) {
  const parsed = parseUrlPattern(pattern);
  if (!parsed) return 0;
  return parsed.segments.length * 1000 + parsed.host.length;
}

/**
 * Finds the most specific site whose pattern matches the URL.
 *
 * @param {string} urlString - The URL being visited.
 * @param {Array<Object>} sites - Sites holding a `urlPattern` field.
 * @param {Function} [filter] - Optional predicate to skip sites (e.g. disabled ones).
 * @returns {Object|null} The best matching site, or null when nothing matches.
 */
export function findMatchingSite(urlString, sites, filter) {
  if (!Array.isArray(sites)) return null;

  let best = null;
  let bestScore = -1;

  for (const site of sites) {
    if (!site || typeof site.urlPattern !== 'string') continue;
    if (filter && !filter(site)) continue;
    if (!urlMatchesPattern(urlString, site.urlPattern)) continue;

    const score = patternSpecificity(site.urlPattern);
    if (score > bestScore) {
      best = site;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Finds a site already limiting exactly this pattern, comparing normalized forms
 * so `www.Facebook.com/` and `facebook.com` are recognized as the same rule.
 *
 * @param {string} pattern - The pattern being added or edited.
 * @param {Array<Object>} sites - Existing sites.
 * @param {string} [excludeSiteId] - Site to ignore (the one being edited).
 * @returns {Object|null} The conflicting site, or null when the pattern is free.
 */
export function findSiteWithSamePattern(pattern, sites, excludeSiteId) {
  const normalized = normalizeUrlPattern(pattern);
  if (!normalized || !Array.isArray(sites)) return null;

  return (
    sites.find(
      (site) =>
        site &&
        site.id !== excludeSiteId &&
        normalizeUrlPattern(site.urlPattern) === normalized
    ) || null
  );
}

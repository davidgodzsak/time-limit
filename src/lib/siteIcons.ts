/**
 * Where a site's icon comes from, for every extension page that shows one.
 *
 * Nothing here downloads or stores image bytes. Each source is already cached
 * by the browser:
 * - **Chromium**: `_favicon/?pageUrl=…` reads the browser's own favicon
 *   database, which is local and instant (the `favicon` permission, added to
 *   the Chrome manifest only).
 * - **Firefox** has no such API, so the background records the icon a limited
 *   site shows in its tab (`siteIcons` in storage, see
 *   background_scripts/site_icon_storage.js). The image then comes from the
 *   HTTP cache. A site not seen since the extension started recording falls
 *   back to its `/favicon.ico`, and then to a letter.
 *
 * `siteIcons` is read once per page and shared by every icon on it, and a
 * source that failed to load is not tried again on the same page.
 */

const SITE_ICONS_KEY = 'siteIcons';

type IconMap = Record<string, string>;

let recordedIcons: IconMap | null = null;
let recordedIconsPromise: Promise<IconMap> | null = null;
const failedSources = new Set<string>();

function isFirefox(): boolean {
  try {
    return browser.runtime.getURL('').startsWith('moz-extension://');
  } catch {
    return false;
  }
}

/**
 * The host an icon belongs to, from a stored pattern (`youtube.com/shorts`), a
 * hostname (`www.instagram.com`) or a full URL. `null` for anything that is
 * not a website.
 */
export function iconHost(site: string | null | undefined): string | null {
  if (!site) return null;
  let value = site.trim().toLowerCase();
  if (!value) return null;

  if (value.includes('://')) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      value = url.hostname;
    } catch {
      return null;
    }
  }

  const host = value.split(/[/?#]/)[0].replace(/^www\./, '');
  return /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(host) ? host : null;
}

function chromiumFaviconUrl(host: string): string {
  const pageUrl = encodeURIComponent(`https://${host}/`);
  return browser.runtime.getURL(`/_favicon/?pageUrl=${pageUrl}&size=32`);
}

function loadRecordedIcons(): Promise<IconMap> {
  if (recordedIconsPromise) return recordedIconsPromise;

  recordedIconsPromise = (async () => {
    try {
      const result = await browser.storage.local.get(SITE_ICONS_KEY);
      const icons = result?.[SITE_ICONS_KEY];
      recordedIcons = icons && typeof icons === 'object' ? (icons as IconMap) : {};
    } catch {
      recordedIcons = {};
    }

    // Keep the shared copy current while the page stays open; a site visited
    // in another tab then shows its icon on the next render.
    try {
      browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[SITE_ICONS_KEY]) {
          recordedIcons = (changes[SITE_ICONS_KEY].newValue as IconMap) ?? {};
        }
      });
    } catch {
      // No listener, no live refresh: the first read is still good.
    }

    return recordedIcons;
  })();

  return recordedIconsPromise;
}

function buildSources(host: string | null, preferred: string | undefined, icons: IconMap | null): string[] {
  const sources: string[] = [];
  // The popup passes the tab's own icon; browser-internal ones would not load.
  if (preferred && /^(https?:|data:image\/)/.test(preferred)) sources.push(preferred);

  if (host) {
    if (isFirefox()) {
      if (icons?.[host]) sources.push(icons[host]);
      sources.push(`https://${host}/favicon.ico`);
    } else {
      sources.push(chromiumFaviconUrl(host));
    }
  }

  return [...new Set(sources)].filter((src) => !failedSources.has(src));
}

/**
 * The sources to try for a site, best first, when they can be known without
 * waiting. `null` means the recorded icons are still loading (Firefox only, on
 * the first icon of a page).
 */
export function getIconSourcesSync(host: string | null, preferred?: string): string[] | null {
  if (isFirefox() && recordedIcons === null) return null;
  return buildSources(host, preferred, recordedIcons);
}

/** Same as `getIconSourcesSync`, waiting for the recorded icons if needed. */
export async function getIconSources(host: string | null, preferred?: string): Promise<string[]> {
  const icons = isFirefox() ? await loadRecordedIcons() : null;
  return buildSources(host, preferred, icons);
}

/** Remembers, for this page, that a source did not load. */
export function markIconSourceFailed(src: string): void {
  failedSources.add(src);
}

/** Test hook: forget everything cached on this page. */
export function resetSiteIconCache(): void {
  recordedIcons = null;
  recordedIconsPromise = null;
  failedSources.clear();
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIconSources,
  getIconSourcesSync,
  iconHost,
  markIconSourceFailed,
  resetSiteIconCache,
} from './siteIcons';

function installBrowser(baseUrl: string, siteIcons?: Record<string, string>) {
  const get = vi.fn(async () => ({ siteIcons }));
  vi.stubGlobal('browser', {
    runtime: { getURL: (path: string) => baseUrl + path.replace(/^\//, '') },
    storage: { local: { get }, onChanged: { addListener: vi.fn() } },
  });
  return get;
}

beforeEach(() => resetSiteIconCache());

describe('iconHost', () => {
  it('takes the host from patterns, hostnames and URLs', () => {
    expect(iconHost('youtube.com/shorts')).toBe('youtube.com');
    expect(iconHost('www.Instagram.com')).toBe('instagram.com');
    expect(iconHost('https://www.reddit.com/r/rust?x=1')).toBe('reddit.com');
    expect(iconHost('shorts.youtube.com')).toBe('shorts.youtube.com');
  });

  it('has no host for things that are not websites', () => {
    expect(iconHost('')).toBeNull();
    expect(iconHost(null)).toBeNull();
    expect(iconHost('this site')).toBeNull();
    expect(iconHost('chrome://extensions')).toBeNull();
  });
});

describe('icon sources on Chromium', () => {
  it("reads the browser's favicon cache, with nothing to load first", () => {
    const get = installBrowser('chrome-extension://abc/');
    const sources = getIconSourcesSync('reddit.com');
    expect(sources).toEqual([
      'chrome-extension://abc/_favicon/?pageUrl=https%3A%2F%2Freddit.com%2F&size=32',
    ]);
    expect(get).not.toHaveBeenCalled();
  });

  it("tries the tab's own icon first, but never a browser-internal one", () => {
    installBrowser('chrome-extension://abc/');
    expect(getIconSourcesSync('reddit.com', 'https://reddit.com/i.png')?.[0]).toBe(
      'https://reddit.com/i.png'
    );
    expect(getIconSourcesSync('reddit.com', 'chrome://favicon/x')).toHaveLength(1);
  });
});

describe('icon sources on Firefox', () => {
  it('uses the recorded icon, then /favicon.ico', async () => {
    installBrowser('moz-extension://abc/', { 'instagram.com': 'https://cdn.example/ig.png' });
    expect(getIconSourcesSync('instagram.com')).toBeNull(); // not loaded yet
    expect(await getIconSources('instagram.com')).toEqual([
      'https://cdn.example/ig.png',
      'https://instagram.com/favicon.ico',
    ]);
  });

  it('reads storage once per page, however many icons it shows', async () => {
    const get = installBrowser('moz-extension://abc/', {});
    await Promise.all([getIconSources('a.com'), getIconSources('b.com'), getIconSources('c.com')]);
    expect(getIconSourcesSync('d.com')).toEqual(['https://d.com/favicon.ico']);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('does not retry a source that failed on this page', async () => {
    installBrowser('moz-extension://abc/', {});
    markIconSourceFailed('https://a.com/favicon.ico');
    expect(await getIconSources('a.com')).toEqual([]);
  });
});

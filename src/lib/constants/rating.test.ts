import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRatingUrl } from './rating';

function runningAt(base: string) {
  vi.stubGlobal('browser', { runtime: { getURL: (path: string) => base + path } });
}

describe('getRatingUrl', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends Firefox users to addons.mozilla.org', () => {
    runningAt('moz-extension://3f2a/');
    expect(getRatingUrl()).toContain('addons.mozilla.org');
  });

  it('sends Chrome, Brave and Edge users to the Chrome Web Store', () => {
    runningAt('chrome-extension://fhlebfafkdeiclbanmjjojjijdgllbbf/');
    expect(getRatingUrl()).toContain('chromewebstore.google.com');
  });
});

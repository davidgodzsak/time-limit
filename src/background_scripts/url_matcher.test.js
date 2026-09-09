import { describe, expect, it } from 'vitest';
import {
  findMatchingSite,
  findSiteWithSamePattern,
  hasRestrictedProtocol,
  isValidUrlPattern,
  normalizeUrlPattern,
  parseUrlPattern,
  patternSpecificity,
  urlMatchesPattern,
} from './url_matcher.js';

describe('normalizeUrlPattern', () => {
  it('strips protocol, www, query, hash and trailing slashes', () => {
    expect(normalizeUrlPattern('HTTPS://www.YouTube.com/Shorts/?t=1#x')).toBe(
      'youtube.com/shorts'
    );
    expect(normalizeUrlPattern('  facebook.com/  ')).toBe('facebook.com');
    expect(normalizeUrlPattern('http://reddit.com//r//hungary/')).toBe(
      'reddit.com/r/hungary'
    );
  });

  it('keeps explicit subdomains', () => {
    expect(normalizeUrlPattern('shorts.youtube.com')).toBe('shorts.youtube.com');
  });

  it('rejects empty input', () => {
    expect(normalizeUrlPattern('')).toBeNull();
    expect(normalizeUrlPattern('   ')).toBeNull();
    expect(normalizeUrlPattern(null)).toBeNull();
    expect(normalizeUrlPattern('https://')).toBeNull();
  });
});

describe('parseUrlPattern', () => {
  it('splits host from path', () => {
    expect(parseUrlPattern('youtube.com/shorts')).toEqual({
      host: 'youtube.com',
      path: '/shorts',
      segments: ['shorts'],
    });
  });

  it('reports an empty path for host-only patterns', () => {
    expect(parseUrlPattern('youtube.com')).toEqual({
      host: 'youtube.com',
      path: '',
      segments: [],
    });
  });
});

describe('isValidUrlPattern', () => {
  it.each([
    ['youtube.com', true],
    ['shorts.youtube.com', true],
    ['youtube.com/shorts', true],
    ['reddit.com/r/hungary', true],
    ['not a host', false],
    ['localhost:3000', false],
    ['a..b.com', false],
    ['', false],
  ])('%s -> %s', (pattern, expected) => {
    expect(isValidUrlPattern(pattern)).toBe(expected);
  });
});

describe('hasRestrictedProtocol', () => {
  it('flags protocols we refuse to limit', () => {
    expect(hasRestrictedProtocol('javascript:alert(1)')).toBe(true);
    expect(hasRestrictedProtocol('moz-extension://abc')).toBe(true);
    expect(hasRestrictedProtocol('https://youtube.com')).toBe(false);
  });
});

describe('urlMatchesPattern', () => {
  it('matches a domain and its subdomains, but not lookalikes', () => {
    expect(urlMatchesPattern('https://youtube.com/', 'youtube.com')).toBe(true);
    expect(urlMatchesPattern('https://www.youtube.com/', 'youtube.com')).toBe(true);
    expect(urlMatchesPattern('https://mail.google.com/mail', 'google.com')).toBe(true);
    expect(urlMatchesPattern('https://notyoutube.com/', 'youtube.com')).toBe(false);
  });

  it('limits a single subdomain when the pattern names one', () => {
    expect(urlMatchesPattern('https://shorts.youtube.com/x', 'shorts.youtube.com')).toBe(true);
    expect(urlMatchesPattern('https://www.youtube.com/x', 'shorts.youtube.com')).toBe(false);
  });

  it('matches a path only on segment boundaries', () => {
    expect(urlMatchesPattern('https://www.youtube.com/shorts', 'youtube.com/shorts')).toBe(true);
    expect(urlMatchesPattern('https://www.youtube.com/shorts/', 'youtube.com/shorts')).toBe(true);
    expect(urlMatchesPattern('https://www.youtube.com/shorts/abc', 'youtube.com/shorts')).toBe(true);
    expect(urlMatchesPattern('https://www.youtube.com/shortsomething', 'youtube.com/shorts')).toBe(false);
    expect(urlMatchesPattern('https://www.youtube.com/watch?v=1', 'youtube.com/shorts')).toBe(false);
  });

  it('matches deep paths', () => {
    expect(
      urlMatchesPattern('https://www.reddit.com/r/hungary/comments/1', 'reddit.com/r/hungary')
    ).toBe(true);
    expect(urlMatchesPattern('https://www.reddit.com/r/other', 'reddit.com/r/hungary')).toBe(false);
  });

  it('ignores case and query strings', () => {
    expect(urlMatchesPattern('https://WWW.YouTube.com/SHORTS?x=1', 'youtube.com/shorts')).toBe(true);
  });

  it('never matches non-http(s) or unparseable URLs', () => {
    expect(urlMatchesPattern('about:blank', 'youtube.com')).toBe(false);
    expect(urlMatchesPattern('moz-extension://abc/page.html', 'youtube.com')).toBe(false);
    expect(urlMatchesPattern('not-a-url', 'youtube.com')).toBe(false);
    expect(urlMatchesPattern('https://youtube.com', '')).toBe(false);
  });
});

describe('patternSpecificity', () => {
  it('ranks deeper paths above longer hosts', () => {
    expect(patternSpecificity('youtube.com/shorts')).toBeGreaterThan(
      patternSpecificity('shorts.youtube.com')
    );
    expect(patternSpecificity('shorts.youtube.com')).toBeGreaterThan(
      patternSpecificity('youtube.com')
    );
    expect(patternSpecificity('reddit.com/r/hungary')).toBeGreaterThan(
      patternSpecificity('reddit.com/r')
    );
  });
});

describe('findMatchingSite', () => {
  const sites = [
    { id: 'domain', urlPattern: 'youtube.com' },
    { id: 'section', urlPattern: 'youtube.com/shorts' },
    { id: 'disabled', urlPattern: 'facebook.com', isEnabled: false },
  ];

  it('prefers the most specific matching pattern', () => {
    expect(findMatchingSite('https://youtube.com/shorts/abc', sites).id).toBe('section');
    expect(findMatchingSite('https://youtube.com/watch', sites).id).toBe('domain');
  });

  it('honours the filter, so disabled rules can be skipped', () => {
    const enabledOnly = (site) => site.isEnabled !== false;
    expect(findMatchingSite('https://facebook.com/', sites).id).toBe('disabled');
    expect(findMatchingSite('https://facebook.com/', sites, enabledOnly)).toBeNull();
  });

  it('returns null for no match and tolerates bad input', () => {
    expect(findMatchingSite('https://example.com/', sites)).toBeNull();
    expect(findMatchingSite('https://example.com/', null)).toBeNull();
    expect(findMatchingSite('https://example.com/', [{ id: 'x' }, null])).toBeNull();
  });
});

describe('findSiteWithSamePattern', () => {
  const sites = [
    { id: '1', urlPattern: 'facebook.com' },
    { id: '2', urlPattern: 'youtube.com/shorts' },
  ];

  it('recognizes the same rule written differently', () => {
    expect(findSiteWithSamePattern('https://www.Facebook.com/', sites).id).toBe('1');
    expect(findSiteWithSamePattern('www.youtube.com/shorts/', sites).id).toBe('2');
  });

  it('treats a narrower pattern as a different rule', () => {
    expect(findSiteWithSamePattern('facebook.com/marketplace', sites)).toBeNull();
    expect(findSiteWithSamePattern('youtube.com', sites)).toBeNull();
  });

  it('can exclude the site being edited', () => {
    expect(findSiteWithSamePattern('facebook.com', sites, '1')).toBeNull();
  });
});

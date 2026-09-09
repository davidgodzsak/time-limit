import { describe, expect, it } from 'vitest';
import { getSectionPattern, getSitePattern } from './urlScope';

describe('getSitePattern', () => {
  it('returns the host without www', () => {
    expect(getSitePattern('https://www.youtube.com/shorts/abc')).toBe('youtube.com');
    expect(getSitePattern('https://shorts.youtube.com/')).toBe('shorts.youtube.com');
  });

  it('ignores anything that is not http(s)', () => {
    expect(getSitePattern('moz-extension://abc/popup.html')).toBeNull();
    expect(getSitePattern('about:blank')).toBeNull();
    expect(getSitePattern('nonsense')).toBeNull();
  });
});

describe('getSectionPattern', () => {
  it('appends the first path segment', () => {
    expect(getSectionPattern('https://www.youtube.com/shorts/abc')).toBe('youtube.com/shorts');
  });

  it('reaches one level deeper past short routing segments', () => {
    expect(getSectionPattern('https://www.reddit.com/r/hungary/comments/1')).toBe(
      'reddit.com/r/hungary'
    );
    expect(getSectionPattern('https://www.reddit.com/u/someone')).toBe('reddit.com/u/someone');
    expect(getSectionPattern('https://www.youtube.com/c/channel/videos')).toBe(
      'youtube.com/c/channel'
    );
  });

  it('keeps a bare short segment when there is nothing deeper', () => {
    expect(getSectionPattern('https://www.reddit.com/r')).toBe('reddit.com/r');
  });

  it('lowercases the segment', () => {
    expect(getSectionPattern('https://www.youtube.com/SHORTS')).toBe('youtube.com/shorts');
  });

  it('returns null when there is no section to narrow to', () => {
    expect(getSectionPattern('https://www.youtube.com/')).toBeNull();
    expect(getSectionPattern('https://www.youtube.com')).toBeNull();
    expect(getSectionPattern('https://example.com/index.html')).toBeNull();
    expect(getSectionPattern('about:blank')).toBeNull();
  });
});

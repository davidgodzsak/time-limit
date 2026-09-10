import { describe, expect, it } from 'vitest';
import { getSitePattern } from './urlScope';

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

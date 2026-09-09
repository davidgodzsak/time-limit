import { describe, expect, it } from 'vitest';
import { getGroupSiteSuggestions } from './groupSuggestions';

describe('getGroupSiteSuggestions', () => {
  it('suggests sites matching the group theme', () => {
    expect(getGroupSiteSuggestions('Social Media')).toContain('instagram.com');
    expect(getGroupSiteSuggestions('News')).toContain('bbc.com');
    expect(getGroupSiteSuggestions('Shopping')).toContain('amazon.com');
  });

  it('recognizes group names in the other shipped languages', () => {
    expect(getGroupSiteSuggestions('Közösségi média').length).toBeGreaterThan(0);
    expect(getGroupSiteSuggestions('Nachrichten').length).toBeGreaterThan(0);
    expect(getGroupSiteSuggestions('Новини').length).toBeGreaterThan(0);
  });

  it('suggests nothing for a group that fits no category', () => {
    expect(getGroupSiteSuggestions('Work stuff')).toEqual([]);
    expect(getGroupSiteSuggestions('')).toEqual([]);
  });

  it('leaves out sites already in the group, however they were written', () => {
    const suggestions = getGroupSiteSuggestions('Social Media', [
      'instagram.com',
      'https://www.tiktok.com/',
    ]);
    expect(suggestions).not.toContain('instagram.com');
    expect(suggestions).not.toContain('tiktok.com');
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('caps how many it offers', () => {
    expect(getGroupSiteSuggestions('Social Media').length).toBeLessThanOrEqual(4);
    expect(getGroupSiteSuggestions('Social Media', [], 2)).toHaveLength(2);
  });
});

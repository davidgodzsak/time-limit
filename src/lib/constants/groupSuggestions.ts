/**
 * Site suggestions offered when adding a page to a group.
 *
 * The suggestions follow the group itself: a "Social Media" group offers social
 * networks, a "News" group offers news sites, and a group whose name matches no
 * category offers nothing at all — better than pushing tiktok.com at someone
 * who is building a group of news sites.
 *
 * Keywords cover the languages the extension ships in, so a group called
 * "Közösségi média" or "Nachrichten" is recognized too.
 */

interface SuggestionCategory {
  keywords: string[];
  sites: string[];
}

const CATEGORIES: SuggestionCategory[] = [
  {
    keywords: [
      'social', 'media', 'soziale', 'sozial', 'redes', 'sociales', 'réseaux',
      'reseaux', 'sociaux', 'közösségi', 'kozossegi', 'społeczne', 'spoleczne',
      'sociálne', 'socialne', 'соціальні', 'соцмережі',
    ],
    sites: [
      'instagram.com', 'tiktok.com', 'facebook.com', 'x.com',
      'reddit.com', 'linkedin.com', 'snapchat.com', 'pinterest.com',
    ],
  },
  {
    keywords: [
      'news', 'nachrichten', 'noticias', 'actualités', 'actualites', 'hírek',
      'hirek', 'wiadomości', 'wiadomosci', 'správy', 'spravy', 'новини',
    ],
    sites: ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com'],
  },
  {
    keywords: [
      'video', 'videó', 'videos', 'vídeos', 'vidéo', 'wideo', 'відео',
      'streaming', 'stream', 'tv',
    ],
    sites: ['youtube.com', 'netflix.com', 'twitch.tv', 'youtube.com/shorts'],
  },
  {
    keywords: [
      'shop', 'shopping', 'webshop', 'einkaufen', 'compras', 'achats',
      'vásárlás', 'vasarlas', 'zakupy', 'nákupy', 'nakupy', 'покупки',
    ],
    sites: ['amazon.com', 'ebay.com', 'aliexpress.com', 'etsy.com'],
  },
  {
    keywords: [
      'gaming', 'game', 'games', 'spiele', 'juegos', 'jeux', 'játék', 'jatek',
      'gry', 'hry', 'ігри',
    ],
    sites: ['store.steampowered.com', 'epicgames.com', 'roblox.com', 'ign.com'],
  },
  {
    keywords: ['forum', 'forums', 'fórum', 'foren', 'foros', 'форум'],
    sites: ['reddit.com', 'quora.com', 'news.ycombinator.com', 'stackoverflow.com'],
  },
];

/** Normalizes a stored pattern or suggestion for comparison. */
function canonical(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

/**
 * Suggests sites to add to a group, based on the group's name.
 * Sites already in the group are left out, so the row shrinks as it gets used.
 *
 * @param groupName - The group's name, as the user wrote it.
 * @param existingPatterns - Patterns already limited in this group.
 * @param limit - How many suggestions to return at most.
 * @returns Matching suggestions, or an empty array when the group fits no category.
 */
export function getGroupSiteSuggestions(
  groupName: string,
  existingPatterns: string[] = [],
  limit = 4
): string[] {
  if (!groupName) return [];

  const name = groupName.toLowerCase();
  const category = CATEGORIES.find((candidate) =>
    candidate.keywords.some((keyword) => name.includes(keyword))
  );
  if (!category) return [];

  const taken = new Set(existingPatterns.map(canonical));
  return category.sites.filter((site) => !taken.has(canonical(site))).slice(0, limit);
}

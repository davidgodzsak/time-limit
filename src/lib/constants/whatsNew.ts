/**
 * @file whatsNew.ts
 * @description What the popup shows once after an update.
 *
 * Edit this list as part of preparing a release: it is the only place the
 * release note lives, and whatever stands here is what users see the next time
 * they update. Keep it to two or three lines — anything longer belongs on the
 * info page.
 */

import { BarChart3, type LucideIcon } from 'lucide-react';
import { STATS_PAGE_PATH } from '@/lib/utils/navigation';

export interface WhatsNewHighlight {
  icon: LucideIcon;
  /** i18n key for the one-line headline. */
  titleKey: string;
  /** i18n key for the sentence under it. */
  bodyKey: string;
  /** Optional link to an extension page that shows the new thing. */
  /** `requiresStatistics` hides it when the user has switched statistics off. */
  link?: { path: string; labelKey: string; requiresStatistics?: boolean };
}

export const WHATS_NEW_HIGHLIGHTS: WhatsNewHighlight[] = [
  // 1.14.0: the statistics page. It starts empty for everyone, so the note
  // says it fills in over a few days; the popup reminds them once it has
  // (stats_prompt_storage.js). The 1.13.1 opens-limit note was dropped in
  // 1.14.1, a month old by then.
  {
    icon: BarChart3,
    titleKey: 'whatsNew_stats_title',
    bodyKey: 'whatsNew_stats_body',
    link: { path: STATS_PAGE_PATH, labelKey: 'whatsNew_stats_link', requiresStatistics: true },
  },
];

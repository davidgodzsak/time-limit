/**
 * @file whatsNew.ts
 * @description What the popup shows once after an update.
 *
 * Edit this list as part of preparing a release: it is the only place the
 * release note lives, and whatever stands here is what users see the next time
 * they update. Keep it to two or three lines — anything longer belongs on the
 * info page.
 */

import { Ban, Globe, type LucideIcon } from 'lucide-react';

export interface WhatsNewHighlight {
  icon: LucideIcon;
  /** i18n key for the one-line headline. */
  titleKey: string;
  /** i18n key for the sentence under it. */
  bodyKey: string;
}

export const WHATS_NEW_HIGHLIGHTS: WhatsNewHighlight[] = [
  {
    icon: Globe,
    titleKey: 'whatsNew_languages_title',
    bodyKey: 'whatsNew_languages_body',
  },
  // Kept from 1.12.0: it is the strictest rule in the extension and worth a
  // second mention. The 1.11.0 notes (the pause and limit suggestions) are gone
  // — nearly a month has passed, so users have seen them.
  {
    icon: Ban,
    titleKey: 'whatsNew_fullBlock_title',
    bodyKey: 'whatsNew_fullBlock_body',
  },
];

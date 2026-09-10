/**
 * @file whatsNew.ts
 * @description What the popup shows once after an update.
 *
 * Edit this list as part of preparing a release: it is the only place the
 * release note lives, and whatever stands here is what users see the next time
 * they update. Keep it to two or three lines — anything longer belongs on the
 * info page.
 */

import { Hourglass, Lightbulb, type LucideIcon } from 'lucide-react';

export interface WhatsNewHighlight {
  icon: LucideIcon;
  /** i18n key for the one-line headline. */
  titleKey: string;
  /** i18n key for the sentence under it. */
  bodyKey: string;
}

export const WHATS_NEW_HIGHLIGHTS: WhatsNewHighlight[] = [
  {
    icon: Hourglass,
    titleKey: 'whatsNew_reflection_title',
    bodyKey: 'whatsNew_reflection_body',
  },
  {
    icon: Lightbulb,
    titleKey: 'whatsNew_suggestions_title',
    bodyKey: 'whatsNew_suggestions_body',
  },
];

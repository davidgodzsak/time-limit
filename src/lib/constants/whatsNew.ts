/**
 * @file whatsNew.ts
 * @description What the popup shows once after an update.
 *
 * Edit this list as part of preparing a release: it is the only place the
 * release note lives, and whatever stands here is what users see the next time
 * they update. Keep it to two or three lines — anything longer belongs on the
 * info page.
 */

import { DoorOpen, Globe, type LucideIcon } from 'lucide-react';

export interface WhatsNewHighlight {
  icon: LucideIcon;
  /** i18n key for the one-line headline. */
  titleKey: string;
  /** i18n key for the sentence under it. */
  bodyKey: string;
}

export const WHATS_NEW_HIGHLIGHTS: WhatsNewHighlight[] = [
  // 1.13.1: anyone with an opens limit saw it run out within minutes (#9), so
  // they need to hear it works now and what an open means.
  {
    icon: DoorOpen,
    titleKey: 'whatsNew_opens_title',
    bodyKey: 'whatsNew_opens_body',
  },
  // Kept from 1.13.0, only two weeks old. The full block note from 1.12.0 is
  // gone — over a month has passed, so users have seen it.
  {
    icon: Globe,
    titleKey: 'whatsNew_languages_title',
    bodyKey: 'whatsNew_languages_body',
  },
];

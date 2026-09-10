/**
 * @file whats_new_storage.js
 * @description Remembers that the extension was updated, so the popup can show
 * a short "what's new" note once and then get out of the way.
 *
 * Only real updates set it: a fresh install goes through onboarding instead,
 * and there is nothing new to a user who has never seen the old version.
 */

const WHATS_NEW_KEY = 'whatsNewState';

/**
 * Reads the release-note state.
 *
 * @returns {Promise<{pending: boolean, version: string|null, previousVersion: string|null}>}
 */
export async function getWhatsNewState() {
  try {
    const data = await browser.storage.local.get(WHATS_NEW_KEY);
    const state = data[WHATS_NEW_KEY] || {};
    return {
      pending: state.pending === true,
      version: state.version || null,
      previousVersion: state.previousVersion || null,
    };
  } catch (error) {
    console.error('[WhatsNew] Error reading state:', error);
    return { pending: false, version: null, previousVersion: null };
  }
}

/**
 * Flags that the user has an update they have not been told about yet.
 *
 * @param {string} version - The version now installed.
 * @param {string|null} previousVersion - The version it replaced.
 * @returns {Promise<boolean>} True on success.
 */
export async function flagUpdate(version, previousVersion) {
  try {
    await browser.storage.local.set({
      [WHATS_NEW_KEY]: {
        pending: true,
        version: version || null,
        previousVersion: previousVersion || null,
        updatedAt: Date.now(),
      },
    });
    return true;
  } catch (error) {
    console.error('[WhatsNew] Error flagging update:', error);
    return false;
  }
}

/**
 * Clears the flag once the note has been shown and dismissed.
 *
 * @returns {Promise<boolean>} True on success.
 */
export async function markWhatsNewSeen() {
  try {
    const state = await getWhatsNewState();
    await browser.storage.local.set({
      [WHATS_NEW_KEY]: {
        pending: false,
        version: state.version,
        previousVersion: state.previousVersion,
        seenAt: Date.now(),
      },
    });
    return true;
  } catch (error) {
    console.error('[WhatsNew] Error marking release note as seen:', error);
    return false;
  }
}

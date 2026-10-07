/**
 * @file site_storage.js
 * @description Manages CRUD operations for distracting sites in browser.storage.local.
 * Updated to support both time limits and open count limits.
 *
 * Patterns are normalized on the way in (see url_matcher.js) and every site
 * must hold a unique pattern, so the same page cannot be limited twice — not as
 * two individual sites, and not as an individual site plus a group member.
 */

import {
  findSiteWithSamePattern,
  isValidUrlPattern,
  normalizeUrlPattern,
} from './url_matcher.js';

/**
 * Finds the site that already limits a pattern, if any.
 * Used before adding or renaming a site so callers can explain the clash.
 *
 * @async
 * @function findSiteByPattern
 * @param {string} pattern - The pattern to look for (raw input is fine; it gets normalized).
 * @param {string} [excludeSiteId] - Site to ignore, e.g. the one being edited.
 * @returns {Promise<Object|null>} The conflicting site, or null when the pattern is unused.
 */
export async function findSiteByPattern(pattern, excludeSiteId) {
  const sites = await getDistractingSites();
  return findSiteWithSamePattern(pattern, sites, excludeSiteId);
}

/**
 * Retrieves the list of distracting sites from storage.
 *
 * @async
 * @function getDistractingSites
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of distracting site objects.
 *                                    Returns an empty array if no sites are found or an error occurs.
 */
export async function getDistractingSites() {
  try {
    const result = await browser.storage.local.get('distractingSites');
    return result.distractingSites || [];
  } catch (error) {
    console.error('Error getting distracting sites:', error);
    return [];
  }
}

/**
 * Adds a new distracting site to the storage.
 * Validates the site object and generates a unique ID.
 *
 * @async
 * @function addDistractingSite
 * @param {Object} siteObject - The site object to add.
 * @param {string} siteObject.urlPattern - The URL pattern for the site.
 * @param {number} siteObject.dailyLimitSeconds - The daily time limit in seconds.
 * @param {number} [siteObject.dailyOpenLimit] - The daily open count limit (optional).
 * @param {boolean} [siteObject.isBlocked] - Blocks the site outright; no allowance, no countdown.
 * @param {boolean} [siteObject.isEnabled=true] - Whether the site rule is enabled.
 * @param {string} [siteObject.groupId] - The ID of the group this site belongs to (optional).
 * @returns {Promise<Object|null>} A promise that resolves to the added site object (including its new ID)
 *                                 or null if validation fails or a storage error occurs.
 */
export async function addDistractingSite(siteObject) {
  // Validate required field: urlPattern
  if (
    !siteObject ||
    typeof siteObject.urlPattern !== 'string' ||
    siteObject.urlPattern.trim() === ''
  ) {
    console.error(
      "Invalid siteObject provided to addDistractingSite. 'urlPattern' (non-empty string) is required.",
      siteObject
    );
    return null;
  }

  // Validate dailyLimitSeconds if provided (optional, but must be positive if present)
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'dailyLimitSeconds') &&
    (typeof siteObject.dailyLimitSeconds !== 'number' ||
      siteObject.dailyLimitSeconds <= 0)
  ) {
    console.error(
      'Invalid dailyLimitSeconds provided to addDistractingSite. Must be a positive number if specified.',
      siteObject.dailyLimitSeconds
    );
    return null;
  }

  // Validate dailyOpenLimit if provided (optional, but must be positive if present)
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'dailyOpenLimit') &&
    (typeof siteObject.dailyOpenLimit !== 'number' ||
      siteObject.dailyOpenLimit <= 0)
  ) {
    console.error(
      'Invalid dailyOpenLimit provided to addDistractingSite. Must be a positive number if specified.',
      siteObject.dailyOpenLimit
    );
    return null;
  }


  // Validate reflectionDelaySeconds if provided (the pause shown before the
  // site opens; a site may have this and no hard limit at all)
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'reflectionDelaySeconds') &&
    (typeof siteObject.reflectionDelaySeconds !== 'number' ||
      siteObject.reflectionDelaySeconds <= 0)
  ) {
    console.error(
      'Invalid reflectionDelaySeconds provided to addDistractingSite. Must be a positive number if specified.',
      siteObject.reflectionDelaySeconds
    );
    return null;
  }

  // Validate isBlocked if provided (the full block: the site never opens)
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'isBlocked') &&
    typeof siteObject.isBlocked !== 'boolean'
  ) {
    console.error(
      'Invalid isBlocked provided to addDistractingSite. Must be a boolean if specified.',
      siteObject.isBlocked
    );
    return null;
  }

  // Validate groupId if provided
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'groupId') &&
    (typeof siteObject.groupId !== 'string' || siteObject.groupId.trim() === '')
  ) {
    console.error(
      'Invalid groupId provided to addDistractingSite. Must be a non-empty string if specified.',
      siteObject.groupId
    );
    return null;
  }

  const normalizedPattern = normalizeUrlPattern(siteObject.urlPattern);
  if (!normalizedPattern || !isValidUrlPattern(normalizedPattern)) {
    console.error(
      'Invalid urlPattern provided to addDistractingSite.',
      siteObject.urlPattern
    );
    return null;
  }

  const newSite = {
    id: crypto.randomUUID(),
    urlPattern: normalizedPattern,
    dailyLimitSeconds: siteObject.dailyLimitSeconds,
    isEnabled:
      typeof siteObject.isEnabled === 'boolean' ? siteObject.isEnabled : true,
  };

  // Add dailyOpenLimit if provided
  if (Object.prototype.hasOwnProperty.call(siteObject, 'dailyOpenLimit')) {
    newSite.dailyOpenLimit = siteObject.dailyOpenLimit;
  }

  // Add reflectionDelaySeconds if provided
  if (
    Object.prototype.hasOwnProperty.call(siteObject, 'reflectionDelaySeconds')
  ) {
    newSite.reflectionDelaySeconds = siteObject.reflectionDelaySeconds;
  }

  // Add the full block only when it is on — an off block is simply absent.
  if (siteObject.isBlocked === true) {
    newSite.isBlocked = true;
  }

  // Add groupId if provided
  if (Object.prototype.hasOwnProperty.call(siteObject, 'groupId')) {
    newSite.groupId = siteObject.groupId;
  }

  try {
    const sites = await getDistractingSites();

    const conflict = findSiteWithSamePattern(normalizedPattern, sites);
    if (conflict) {
      console.warn(
        `Site "${normalizedPattern}" is already limited (site ID "${conflict.id}"); refusing to add a duplicate.`
      );
      return null;
    }

    sites.push(newSite);
    await browser.storage.local.set({ distractingSites: sites });
    return newSite;
  } catch (error) {
    console.error('Error adding distracting site:', error);
    return null;
  }
}

/**
 * Updates an existing distracting site in storage by its ID.
 * Validates the updates before applying them.
 *
 * @async
 * @function updateDistractingSite
 * @param {string} siteId - The ID of the site to update.
 * @param {Object} updates - An object containing the properties to update.
 * @param {string} [updates.urlPattern] - The new URL pattern.
 * @param {number} [updates.dailyLimitSeconds] - The new daily time limit in seconds.
 * @param {number} [updates.dailyOpenLimit] - The new daily open count limit.
 * @param {boolean} [updates.isEnabled] - The new enabled state.
 * @param {string} [updates.groupId] - The new group ID (or null to remove from group).
 * @returns {Promise<Object|null>} A promise that resolves to the updated site object
 *                                 or null if the site is not found, validation fails, or a storage error occurs.
 */
export async function updateDistractingSite(siteId, updates) {
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to updateDistractingSite.');
    return null;
  }
  if (
    !updates ||
    typeof updates !== 'object' ||
    Object.keys(updates).length === 0
  ) {
    console.error(
      'Invalid updates object provided to updateDistractingSite.',
      updates
    );
    return null;
  }

  // Validate updates
  if (
    Object.prototype.hasOwnProperty.call(updates, 'urlPattern') &&
    (typeof updates.urlPattern !== 'string' || updates.urlPattern.trim() === '')
  ) {
    console.error(
      'Invalid urlPattern in updates for updateDistractingSite.',
      updates.urlPattern
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'dailyLimitSeconds') &&
    updates.dailyLimitSeconds !== null &&
    (typeof updates.dailyLimitSeconds !== 'number' ||
      updates.dailyLimitSeconds <= 0)
  ) {
    console.error(
      'Invalid dailyLimitSeconds in updates for updateDistractingSite.',
      updates.dailyLimitSeconds
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'dailyOpenLimit') &&
    updates.dailyOpenLimit !== null &&
    (typeof updates.dailyOpenLimit !== 'number' || updates.dailyOpenLimit <= 0)
  ) {
    console.error(
      'Invalid dailyOpenLimit in updates for updateDistractingSite.',
      updates.dailyOpenLimit
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'reflectionDelaySeconds') &&
    updates.reflectionDelaySeconds !== null &&
    (typeof updates.reflectionDelaySeconds !== 'number' ||
      updates.reflectionDelaySeconds <= 0)
  ) {
    console.error(
      'Invalid reflectionDelaySeconds in updates for updateDistractingSite.',
      updates.reflectionDelaySeconds
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'isEnabled') &&
    typeof updates.isEnabled !== 'boolean'
  ) {
    console.error(
      'Invalid isEnabled in updates for updateDistractingSite.',
      updates.isEnabled
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'isBlocked') &&
    updates.isBlocked !== null &&
    typeof updates.isBlocked !== 'boolean'
  ) {
    console.error(
      'Invalid isBlocked in updates for updateDistractingSite.',
      updates.isBlocked
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'groupId') &&
    updates.groupId !== null &&
    (typeof updates.groupId !== 'string' || updates.groupId.trim() === '')
  ) {
    console.error(
      'Invalid groupId in updates for updateDistractingSite.',
      updates.groupId
    );
    return null;
  }

  let normalizedPattern = null;
  if (Object.prototype.hasOwnProperty.call(updates, 'urlPattern')) {
    normalizedPattern = normalizeUrlPattern(updates.urlPattern);
    if (!normalizedPattern || !isValidUrlPattern(normalizedPattern)) {
      console.error(
        'Invalid urlPattern in updates for updateDistractingSite.',
        updates.urlPattern
      );
      return null;
    }
  }

  try {
    const sites = await getDistractingSites();
    const siteIndex = sites.findIndex((site) => site.id === siteId);

    if (siteIndex === -1) {
      console.warn(`Site with ID "${siteId}" not found for update.`);
      return null;
    }

    if (normalizedPattern) {
      const conflict = findSiteWithSamePattern(
        normalizedPattern,
        sites,
        siteId
      );
      if (conflict) {
        console.warn(
          `Cannot rename site "${siteId}" to "${normalizedPattern}": already limited by site ID "${conflict.id}".`
        );
        return null;
      }
    }

    // Create the updated site object by merging current site with validated updates
    const updatedSite = { ...sites[siteIndex], ...updates };
    if (normalizedPattern) {
      updatedSite.urlPattern = normalizedPattern;
    }

    // Remove limits that were explicitly cleared (passed as null)
    if (updates.dailyOpenLimit === null) {
      delete updatedSite.dailyOpenLimit;
    }
    if (updates.dailyLimitSeconds === null) {
      delete updatedSite.dailyLimitSeconds;
    }
    if (updates.reflectionDelaySeconds === null) {
      delete updatedSite.reflectionDelaySeconds;
    }
    // Leaving a group is the absence of a groupId, not a null one — same rule
    // as the limits above, and it keeps `Object.hasOwn(site, 'groupId')` an
    // honest test of membership.
    if (updates.groupId === null) {
      delete updatedSite.groupId;
    }
    // An off block is stored as the absence of the flag, so turning it off
    // removes it rather than writing `false`.
    if (updates.isBlocked === false || updates.isBlocked === null) {
      delete updatedSite.isBlocked;
    }

    // A site in a group inherits the group's limits, so it may hold none of its
    // own. A standalone site must keep at least one rule — a time limit, an
    // opens limit, a reflection delay, or a full block, each of which stands on
    // its own.
    if (
      !updatedSite.groupId &&
      updatedSite.isBlocked !== true &&
      typeof updatedSite.dailyLimitSeconds !== 'number' &&
      typeof updatedSite.dailyOpenLimit !== 'number' &&
      typeof updatedSite.reflectionDelaySeconds !== 'number'
    ) {
      console.error(
        `Cannot remove all limits from site "${siteId}". At least one of dailyLimitSeconds, dailyOpenLimit, reflectionDelaySeconds or isBlocked is required.`
      );
      return null;
    }

    sites[siteIndex] = updatedSite;
    await browser.storage.local.set({ distractingSites: sites });
    return updatedSite;
  } catch (error) {
    console.error(
      `Error updating distracting site with ID "${siteId}":`,
      error
    );
    return null;
  }
}

/**
 * Deletes a distracting site from storage by its ID.
 *
 * @async
 * @function deleteDistractingSite
 * @param {string} siteId - The ID of the site to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if deletion was successful,
 *                             false if the site was not found, siteId was invalid or a storage error occurred.
 */
export async function deleteDistractingSite(siteId) {
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to deleteDistractingSite.');
    return false;
  }
  try {
    let sites = await getDistractingSites();
    const initialLength = sites.length;
    sites = sites.filter((site) => site.id !== siteId);

    if (sites.length === initialLength) {
      console.warn(`Site with ID "${siteId}" not found for deletion.`);
      return false; // Site not found
    }

    await browser.storage.local.set({ distractingSites: sites });
    return true;
  } catch (error) {
    console.error(
      `Error deleting distracting site with ID "${siteId}":`,
      error
    );
    return false;
  }
}

/**
 * Reports whether a site carries a rule of its own, as opposed to inheriting
 * everything from its group. Mirrors the guard in `updateDistractingSite`:
 * a time limit, an opens limit, a reflection delay and a full block each stand
 * on their own.
 *
 * @param {Object} site - A stored site object.
 * @returns {boolean} True when the site would still mean something standalone.
 */
export function siteHasOwnRule(site) {
  if (!site || typeof site !== 'object') return false;
  return (
    site.isBlocked === true ||
    typeof site.dailyLimitSeconds === 'number' ||
    typeof site.dailyOpenLimit === 'number' ||
    typeof site.reflectionDelaySeconds === 'number'
  );
}

/**
 * Takes a site out of its group and leaves it in a state the Settings page can
 * actually show.
 *
 * A group member usually holds no limits of its own — the group supplies them —
 * and `updateDistractingSite` refuses to leave a standalone site with no rule
 * at all. Simply clearing `groupId` therefore failed for exactly the sites this
 * is called for, and the site stayed pointing at a group it was no longer in:
 * invisible in both Settings tabs (the individual list filters on `!groupId`,
 * the group no longer lists it) while still holding its pattern, so re-adding
 * the page came back "already limited" with nowhere to go and fix it.
 *
 * So: a site with rules of its own becomes standalone, and a site whose only
 * reason to exist was its membership is deleted with it.
 *
 * @async
 * @param {string} siteId - The site leaving its group.
 * @returns {Promise<{outcome: 'standalone'|'deleted'|'missing', site: Object|null}>}
 */
export async function detachSiteFromGroup(siteId) {
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to detachSiteFromGroup.');
    return { outcome: 'missing', site: null };
  }

  const sites = await getDistractingSites();
  const site = sites.find((s) => s.id === siteId);
  if (!site) return { outcome: 'missing', site: null };

  if (!siteHasOwnRule(site)) {
    const deleted = await deleteDistractingSite(siteId);
    return { outcome: deleted ? 'deleted' : 'missing', site: deleted ? site : null };
  }

  const updated = await updateDistractingSite(siteId, { groupId: null });
  return updated
    ? { outcome: 'standalone', site: updated }
    : { outcome: 'missing', site: null };
}

/**
 * Detaches every member of a group. Used when the group itself goes away.
 *
 * @async
 * @param {string} groupId - The group being dissolved.
 * @returns {Promise<{standalone: Object[], deletedSiteIds: string[]}>}
 */
export async function detachSitesFromGroup(groupId) {
  const result = { standalone: [], deletedSiteIds: [] };
  if (!groupId || typeof groupId !== 'string') return result;

  const sites = await getDistractingSites();
  const members = sites.filter((site) => site.groupId === groupId);

  for (const member of members) {
    const { outcome, site } = await detachSiteFromGroup(member.id);
    if (outcome === 'standalone' && site) result.standalone.push(site);
    if (outcome === 'deleted') result.deletedSiteIds.push(member.id);
  }

  return result;
}

/**
 * Repairs sites left pointing at a group they are not in — the wreckage of the
 * two bugs above, which shipped, so existing installs carry it.
 *
 * Both broken states are unreachable through the UI, so fixing them on startup
 * is safe: a site whose `groupId` names a group that no longer exists, and a
 * site whose group exists but does not list it. Either way the site is stranded
 * where nothing can edit it while it still holds its URL pattern.
 *
 * @async
 * @param {Array<Object>} groups - All groups, as `getGroups()` returns them.
 * @returns {Promise<{standalone: Object[], deletedSiteIds: string[]}>} What was repaired.
 */
export async function repairOrphanedGroupMembers(groups) {
  const result = { standalone: [], deletedSiteIds: [] };

  try {
    const byId = new Map((groups || []).map((group) => [group.id, group]));
    const sites = await getDistractingSites();

    const orphans = sites.filter((site) => {
      if (!site.groupId) return false;
      const group = byId.get(site.groupId);
      if (!group) return true;
      return !Array.isArray(group.siteIds) || !group.siteIds.includes(site.id);
    });

    for (const orphan of orphans) {
      const { outcome, site } = await detachSiteFromGroup(orphan.id);
      if (outcome === 'standalone' && site) result.standalone.push(site);
      if (outcome === 'deleted') result.deletedSiteIds.push(orphan.id);
    }

    if (orphans.length > 0) {
      console.warn(
        `[SiteStorage] Repaired ${orphans.length} site(s) stranded outside their group.`
      );
    }
  } catch (error) {
    console.error('[SiteStorage] Error repairing orphaned group members:', error);
  }

  return result;
}

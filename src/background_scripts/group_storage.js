/**
 * @file group_storage.js
 * @description Manages CRUD operations for site groups in browser.storage.local.
 * Groups aggregate multiple sites and apply combined time/open count limits.
 */

/**
 * Retrieves all groups from storage.
 *
 * @async
 * @function getGroups
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of group objects.
 *                                    Returns an empty array if no groups are found or an error occurs.
 */
export async function getGroups() {
  try {
    const result = await browser.storage.local.get('groups');
    return result.groups || [];
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
}

/**
 * Adds a new group to storage.
 * Validates the group object and generates a unique ID.
 *
 * @async
 * @function addGroup
 * @param {Object} groupObject - The group object to add.
 * @param {string} groupObject.name - The group name.
 * @param {string} [groupObject.color] - The group color (optional, defaults to a color).
 * @param {number} groupObject.dailyLimitSeconds - The daily time limit in seconds for the group.
 * @param {number} [groupObject.dailyOpenLimit] - The daily open count limit for the group (optional).
 * @param {boolean} [groupObject.isEnabled=true] - Whether the group rule is enabled.
 * @returns {Promise<Object|null>} A promise that resolves to the added group object (including its new ID and siteIds array)
 *                                 or null if validation fails or a storage error occurs.
 */
export async function addGroup(groupObject) {
  if (
    !groupObject ||
    typeof groupObject.name !== 'string' ||
    groupObject.name.trim() === ''
  ) {
    console.error(
      "Invalid groupObject provided to addGroup. 'name' (non-empty string) is required.",
      groupObject
    );
    return null;
  }

  // Validate dailyLimitSeconds if provided
  if (
    Object.prototype.hasOwnProperty.call(groupObject, 'dailyLimitSeconds') &&
    (typeof groupObject.dailyLimitSeconds !== 'number' ||
      groupObject.dailyLimitSeconds <= 0)
  ) {
    console.error(
      'Invalid dailyLimitSeconds provided to addGroup. Must be a positive number if specified.',
      groupObject.dailyLimitSeconds
    );
    return null;
  }

  // Validate dailyOpenLimit if provided
  if (
    Object.prototype.hasOwnProperty.call(groupObject, 'dailyOpenLimit') &&
    (typeof groupObject.dailyOpenLimit !== 'number' ||
      groupObject.dailyOpenLimit <= 0)
  ) {
    console.error(
      'Invalid dailyOpenLimit provided to addGroup. Must be a positive number if specified.',
      groupObject.dailyOpenLimit
    );
    return null;
  }

  // Validate reflectionDelaySeconds if provided
  if (
    Object.prototype.hasOwnProperty.call(groupObject, 'reflectionDelaySeconds') &&
    (typeof groupObject.reflectionDelaySeconds !== 'number' ||
      groupObject.reflectionDelaySeconds <= 0)
  ) {
    console.error(
      'Invalid reflectionDelaySeconds provided to addGroup. Must be a positive number if specified.',
      groupObject.reflectionDelaySeconds
    );
    return null;
  }

  // A group must have at least one rule: a time limit, an opens limit, or a
  // reflection delay (which is usable on its own).
  if (
    typeof groupObject.dailyLimitSeconds !== 'number' &&
    typeof groupObject.dailyOpenLimit !== 'number' &&
    typeof groupObject.reflectionDelaySeconds !== 'number'
  ) {
    console.error(
      'addGroup requires at least one of dailyLimitSeconds, dailyOpenLimit or reflectionDelaySeconds.',
      groupObject
    );
    return null;
  }

  const newGroup = {
    id: crypto.randomUUID(),
    name: groupObject.name.trim(),
    color: groupObject.color || '#6366f1', // Default to indigo
    isEnabled:
      typeof groupObject.isEnabled === 'boolean' ? groupObject.isEnabled : true,
    siteIds: [], // Initialize empty site IDs array
  };

  // Add limits if provided
  if (typeof groupObject.dailyLimitSeconds === 'number') {
    newGroup.dailyLimitSeconds = groupObject.dailyLimitSeconds;
  }
  if (Object.prototype.hasOwnProperty.call(groupObject, 'dailyOpenLimit')) {
    newGroup.dailyOpenLimit = groupObject.dailyOpenLimit;
  }
  if (
    Object.prototype.hasOwnProperty.call(groupObject, 'reflectionDelaySeconds')
  ) {
    newGroup.reflectionDelaySeconds = groupObject.reflectionDelaySeconds;
  }

  try {
    const groups = await getGroups();
    groups.push(newGroup);
    await browser.storage.local.set({ groups });
    return newGroup;
  } catch (error) {
    console.error('Error adding group:', error);
    return null;
  }
}

/**
 * Updates an existing group in storage by its ID.
 * Validates the updates before applying them.
 *
 * @async
 * @function updateGroup
 * @param {string} groupId - The ID of the group to update.
 * @param {Object} updates - An object containing the properties to update.
 * @param {string} [updates.name] - The new group name.
 * @param {string} [updates.color] - The new group color.
 * @param {number} [updates.dailyLimitSeconds] - The new daily time limit in seconds.
 * @param {number} [updates.dailyOpenLimit] - The new daily open count limit.
 * @param {boolean} [updates.isEnabled] - The new enabled state.
 * @returns {Promise<Object|null>} A promise that resolves to the updated group object
 *                                 or null if the group is not found, validation fails, or a storage error occurs.
 */
export async function updateGroup(groupId, updates) {
  if (!groupId || typeof groupId !== 'string') {
    console.error('Invalid groupId provided to updateGroup.');
    return null;
  }
  if (
    !updates ||
    typeof updates !== 'object' ||
    Object.keys(updates).length === 0
  ) {
    console.error('Invalid updates object provided to updateGroup.', updates);
    return null;
  }

  // Validate updates
  if (
    Object.prototype.hasOwnProperty.call(updates, 'name') &&
    (typeof updates.name !== 'string' || updates.name.trim() === '')
  ) {
    console.error(
      'Invalid name in updates for updateGroup.',
      updates.name
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
      'Invalid dailyLimitSeconds in updates for updateGroup.',
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
      'Invalid dailyOpenLimit in updates for updateGroup.',
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
      'Invalid reflectionDelaySeconds in updates for updateGroup.',
      updates.reflectionDelaySeconds
    );
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, 'isEnabled') &&
    typeof updates.isEnabled !== 'boolean'
  ) {
    console.error(
      'Invalid isEnabled in updates for updateGroup.',
      updates.isEnabled
    );
    return null;
  }

  try {
    const groups = await getGroups();
    const groupIndex = groups.findIndex((group) => group.id === groupId);

    if (groupIndex === -1) {
      console.warn(`Group with ID "${groupId}" not found for update.`);
      return null;
    }

    // Create the updated group object by merging current group with validated updates
    const updatedGroup = { ...groups[groupIndex], ...updates };

    // Remove limits that were explicitly cleared (passed as null)
    if (updates.dailyOpenLimit === null) {
      delete updatedGroup.dailyOpenLimit;
    }
    if (updates.dailyLimitSeconds === null) {
      delete updatedGroup.dailyLimitSeconds;
    }
    if (updates.reflectionDelaySeconds === null) {
      delete updatedGroup.reflectionDelaySeconds;
    }

    // A group must always keep at least one rule (time, opens or a delay).
    if (
      typeof updatedGroup.dailyLimitSeconds !== 'number' &&
      typeof updatedGroup.dailyOpenLimit !== 'number' &&
      typeof updatedGroup.reflectionDelaySeconds !== 'number'
    ) {
      console.error(
        `Cannot remove all limits from group "${groupId}". At least one of dailyLimitSeconds, dailyOpenLimit or reflectionDelaySeconds is required.`
      );
      return null;
    }

    groups[groupIndex] = updatedGroup;
    await browser.storage.local.set({ groups });
    return updatedGroup;
  } catch (error) {
    console.error(
      `Error updating group with ID "${groupId}":`,
      error
    );
    return null;
  }
}

/**
 * Deletes a group from storage by its ID.
 * Does NOT delete the sites in the group; they become standalone.
 *
 * @async
 * @function deleteGroup
 * @param {string} groupId - The ID of the group to delete.
 * @returns {Promise<boolean>} A promise that resolves to true if deletion was successful,
 *                             false if the group was not found, groupId was invalid or a storage error occurred.
 */
export async function deleteGroup(groupId) {
  if (!groupId || typeof groupId !== 'string') {
    console.error('Invalid groupId provided to deleteGroup.');
    return false;
  }
  try {
    let groups = await getGroups();
    const initialLength = groups.length;
    groups = groups.filter((group) => group.id !== groupId);

    if (groups.length === initialLength) {
      console.warn(`Group with ID "${groupId}" not found for deletion.`);
      return false; // Group not found
    }

    await browser.storage.local.set({ groups });
    return true;
  } catch (error) {
    console.error(
      `Error deleting group with ID "${groupId}":`,
      error
    );
    return false;
  }
}

/**
 * Adds a site to a group by adding the siteId to the group's siteIds array.
 *
 * @async
 * @function addSiteToGroup
 * @param {string} groupId - The ID of the group.
 * @param {string} siteId - The ID of the site to add to the group.
 * @returns {Promise<Object|null>} A promise that resolves to the updated group object
 *                                 or null if the group is not found or a storage error occurs.
 */
export async function addSiteToGroup(groupId, siteId) {
  if (!groupId || typeof groupId !== 'string') {
    console.error('Invalid groupId provided to addSiteToGroup.');
    return null;
  }
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to addSiteToGroup.');
    return null;
  }

  try {
    const groups = await getGroups();
    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      console.warn(`Group with ID "${groupId}" not found for addSiteToGroup.`);
      return null;
    }

    // Avoid duplicates
    if (!group.siteIds.includes(siteId)) {
      group.siteIds.push(siteId);
      await browser.storage.local.set({ groups });
    }

    return group;
  } catch (error) {
    console.error(
      `Error adding site to group with ID "${groupId}":`,
      error
    );
    return null;
  }
}

/**
 * Removes a site from a group by removing the siteId from the group's siteIds array.
 *
 * @async
 * @function removeSiteFromGroup
 * @param {string} groupId - The ID of the group.
 * @param {string} siteId - The ID of the site to remove from the group.
 * @returns {Promise<Object|null>} A promise that resolves to the updated group object
 *                                 or null if the group is not found or a storage error occurs.
 */
export async function removeSiteFromGroup(groupId, siteId) {
  if (!groupId || typeof groupId !== 'string') {
    console.error('Invalid groupId provided to removeSiteFromGroup.');
    return null;
  }
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to removeSiteFromGroup.');
    return null;
  }

  try {
    const groups = await getGroups();
    const group = groups.find((g) => g.id === groupId);

    if (!group) {
      console.warn(`Group with ID "${groupId}" not found for removeSiteFromGroup.`);
      return null;
    }

    const initialLength = group.siteIds.length;
    group.siteIds = group.siteIds.filter((id) => id !== siteId);

    if (group.siteIds.length < initialLength) {
      await browser.storage.local.set({ groups });
    }

    return group;
  } catch (error) {
    console.error(
      `Error removing site from group with ID "${groupId}":`,
      error
    );
    return null;
  }
}

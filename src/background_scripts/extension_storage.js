/**
 * @file extension_storage.js
 * @description Manages CRUD operations for limit extensions in browser.storage.local.
 * Extensions are stored per-day using "extensions-YYYY-MM-DD" keys, similar to usage statistics.
 * They automatically reset daily as old date keys are deleted.
 */

/**
 * Gets all extensions for a specific date from storage.
 * The date string is used to form a unique key for daily extensions.
 *
 * @async
 * @function getExtensions
 * @param {string} dateString - The date for which to retrieve extensions, in "YYYY-MM-DD" format.
 * @returns {Promise<Object>} A promise that resolves to an object containing extensions keyed by siteId.
 *                            Returns an empty object if no extensions are found for that date.
 */
export async function getExtensions(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    console.error(
      'Error: dateString parameter is required and must be a string for getExtensions.'
    );
    return {};
  }
  const key = `extensions-${dateString}`;
  try {
    const result = await browser.storage.local.get(key);
    const extensions = result[key] || {};
    return extensions;
  } catch (error) {
    console.error(`Error getting extensions for date ${dateString}:`, error);
    return {};
  }
}

/**
 * Sets an extension for a specific site on a specific date.
 *
 * @async
 * @function setExtension
 * @param {string} dateString - The date for which to set the extension, in "YYYY-MM-DD" format.
 * @param {string} siteId - The ID of the site to extend.
 * @param {Object} extensionData - The extension data to store.
 * @param {number} extensionData.extendedMinutes - Additional minutes extended.
 * @param {number} extensionData.extendedOpens - Additional opens extended.
 * @param {string} extensionData.excuse - The user's explanation for needing the extension.
 * @param {number} extensionData.timestamp - When the extension was created (Date.now()).
 * @param {number} extensionData.appliedCount - How many times this extension has been applied (typically 1).
 * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
 */
export async function setExtension(dateString, siteId, extensionData) {
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid dateString provided to setExtension.');
    return false;
  }
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to setExtension.');
    return false;
  }
  if (!extensionData || typeof extensionData !== 'object') {
    console.error('Invalid extensionData provided to setExtension.', extensionData);
    return false;
  }

  const key = `extensions-${dateString}`;
  try {
    const extensions = await getExtensions(dateString);
    extensions[siteId] = extensionData;
    await browser.storage.local.set({ [key]: extensions });
    return true;
  } catch (error) {
    console.error(
      `[ExtensionStorage] ERROR setting extension for site ${siteId} on date ${dateString}:`,
      error
    );
    return false;
  }
}

/**
 * Checks if a site has already been extended today.
 *
 * @async
 * @function hasExtensionToday
 * @param {string} siteId - The ID of the site to check.
 * @param {string} dateString - The date to check (in "YYYY-MM-DD" format).
 * @returns {Promise<boolean>} A promise that resolves to true if the site has an extension today, false otherwise.
 */
export async function hasExtensionToday(siteId, dateString) {
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to hasExtensionToday.');
    return false;
  }
  try {
    const extensions = await getExtensions(dateString);
    return !!extensions[siteId];
  } catch (error) {
    console.error(
      `Error checking if site ${siteId} has extension on ${dateString}:`,
      error
    );
    return false;
  }
}

/**
 * Gets the extension data for a specific site.
 *
 * @async
 * @function getExtension
 * @param {string} dateString - The date to check (in "YYYY-MM-DD" format).
 * @param {string} siteId - The ID of the site to get the extension for.
 * @returns {Promise<Object|null>} The extension data if it exists, null otherwise.
 */
export async function getExtension(dateString, siteId) {
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to getExtension.');
    return null;
  }
  try {
    const extensions = await getExtensions(dateString);
    return extensions[siteId] || null;
  } catch (error) {
    console.error(
      `Error getting extension for site ${siteId} on ${dateString}:`,
      error
    );
    return null;
  }
}

/**
 * Removes an extension for a specific site.
 *
 * @async
 * @function removeExtension
 * @param {string} dateString - The date of the extension (in "YYYY-MM-DD" format).
 * @param {string} siteId - The ID of the site.
 * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
 */
export async function removeExtension(dateString, siteId) {
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid dateString provided to removeExtension.');
    return false;
  }
  if (!siteId || typeof siteId !== 'string') {
    console.error('Invalid siteId provided to removeExtension.');
    return false;
  }

  const key = `extensions-${dateString}`;
  try {
    const extensions = await getExtensions(dateString);
    if (extensions[siteId]) {
      delete extensions[siteId];
      await browser.storage.local.set({ [key]: extensions });
      return true;
    }
    return false;
  } catch (error) {
    console.error(
      `Error removing extension for site ${siteId} on date ${dateString}:`,
      error
    );
    return false;
  }
}

import { getDistractingSites } from './site_storage.js';
import { getGroups } from './group_storage.js';
import { getUsageStats } from './usage_storage.js';
import { getExtensions } from './extension_storage.js';
import { findMatchingSite } from './url_matcher.js';

/**
 * Works out whether a full block covers a site, and who set it.
 *
 * A full block is the strictest rule the extension has: the site never opens,
 * there is no daily allowance to spend and no countdown to sit through. It is
 * deliberately unlike the time/opens limits, where a group *replaces* its
 * members' config:
 *
 * - A blocked group blocks every site in it.
 * - A site keeps its own block inside a group that has none, so adding a
 *   blocked site to a group never silently unblocks it.
 * - Turning the site or the group off (`isEnabled: false`) lifts the block,
 *   the same as it lifts every other rule.
 *
 * Every caller that needs to know "is this page blocked outright" goes through
 * here — the blocker, the badge, the popup's page info and the extend flow.
 *
 * @param {Object|null} site - The matched distracting site.
 * @param {Object|null} group - Its group, if it has one (enabled or not).
 * @returns {{isBlocked: boolean, byGroup: boolean, groupName: string|null}}
 */
export function resolveFullBlock(site, group) {
  const groupActive = !!group && group.isEnabled !== false;
  const byGroup = groupActive && group.isBlocked === true;
  const bySite = !!site && site.isBlocked === true;

  return {
    isBlocked: byGroup || bySite,
    byGroup,
    groupName: byGroup ? group.name || null : null,
  };
}

function _getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The English fallback sentence shown at the bottom of the timeout page.
 * The page itself localizes the `blocked` case; this is what a stale page or a
 * log line gets.
 */
function _generateBlockedReason(groupName) {
  return groupName
    ? `This site is blocked as part of the group "${groupName}".`
    : 'This site is blocked.';
}

function _generateBlockingReason(site, siteStats, timeExceeded, opensExceeded, isGroup = false, groupName = null) {
  const timeSpentMinutes = Math.round(siteStats.timeSpentSeconds / 60);
  const limitMinutes = Math.round(site.dailyLimitSeconds / 60);
  const contextName = isGroup ? `group "${groupName}"` : 'this site';

  if (timeExceeded && opensExceeded) {
    return `You've exceeded both your time limit (${timeSpentMinutes}/${limitMinutes} minutes) and open limit (${siteStats.opens}/${site.dailyOpenLimit} opens) for ${contextName} today.`;
  } else if (timeExceeded) {
    return `You've spent ${timeSpentMinutes} minutes on ${contextName} today, exceeding your ${limitMinutes} minute limit.`;
  } else if (opensExceeded) {
    return `You've opened ${contextName} ${siteStats.opens} times today, exceeding your ${site.dailyOpenLimit} open limit.`;
  }

  return `Daily limit exceeded for ${contextName}.`;
}

/**
 * Aggregates usage statistics across all sites in a group.
 * @private
 * @param {Array} sites - All distracting sites
 * @param {string} groupId - The ID of the group
 * @param {Object} dailyStats - Daily usage statistics keyed by siteId
 * @returns {Object} Aggregated usage stats {timeSpentSeconds, opens}
 */
function _aggregateGroupUsage(sites, groupId, dailyStats) {
  const groupSites = sites.filter((site) => site.groupId === groupId);
  let totalTimeSeconds = 0;
  let totalOpens = 0;

  for (const site of groupSites) {
    const siteStats = dailyStats[site.id] || { timeSpentSeconds: 0, opens: 0 };
    totalTimeSeconds += siteStats.timeSpentSeconds;
    totalOpens += siteStats.opens;
  }

  return { timeSpentSeconds: totalTimeSeconds, opens: totalOpens };
}

export async function checkAndBlockSite(tabId, url) {
  if (!tabId || !url || typeof url !== 'string') {
    return { shouldBlock: false, siteId: null, reason: null, limitType: null };
  }

  try {
    const [distractingSites, groups] = await Promise.all([
      getDistractingSites(),
      getGroups(),
    ]);

    const matchingSite = findMatchingSite(
      url,
      distractingSites,
      (site) => site.isEnabled !== false
    );

    if (!matchingSite) {
      return {
        shouldBlock: false,
        siteId: null,
        reason: null,
        limitType: null,
      };
    }

    const siteGroup = matchingSite.groupId
      ? groups.find((g) => g.id === matchingSite.groupId) || null
      : null;

    // A full block outranks everything else: there is no allowance to measure
    // and nothing an extension could add to, so answer before touching usage.
    const fullBlock = resolveFullBlock(matchingSite, siteGroup);
    if (fullBlock.isBlocked) {
      return {
        shouldBlock: true,
        siteId: matchingSite.id,
        reason: _generateBlockedReason(fullBlock.groupName),
        limitType: 'blocked',
      };
    }

    const dateString = _getCurrentDateString();
    const dailyStats = await getUsageStats(dateString);

    let limitConfig = matchingSite;
    let usageStats;
    let isInGroup = false;
    let groupName = null;

    if (siteGroup && siteGroup.isEnabled !== false) {
      isInGroup = true;
      groupName = siteGroup.name;
      limitConfig = siteGroup;
      usageStats = _aggregateGroupUsage(
        distractingSites,
        matchingSite.groupId,
        dailyStats
      );
    } else {
      usageStats = dailyStats[matchingSite.id] || {
        timeSpentSeconds: 0,
        opens: 0,
      };
    }

    const extensions = await getExtensions(dateString);
    // Extensions apply to the limit being enforced: the group (for grouped
    // sites) or the individual site. limitConfig.id is exactly that key, so an
    // extension made on any site in a group lifts the shared group limit.
    const extension = extensions[limitConfig.id] || null;

    let totalExtendedMinutes = 0;
    let totalExtendedOpens = 0;
    if (extension) {
      totalExtendedMinutes = extension.extendedMinutes || 0;
      totalExtendedOpens = extension.extendedOpens || 0;
    }

    let dailyLimitSeconds = limitConfig.dailyLimitSeconds || 0;
    let dailyOpenLimit = limitConfig.dailyOpenLimit || 0;

    const hasTimeLimit = dailyLimitSeconds > 0;
    const hasOpenLimit = dailyOpenLimit > 0;

    // An extension raises the total daily allowance (base + extension) for the
    // rest of the day; usage is still measured as the day's running total.
    if (totalExtendedMinutes > 0) {
      dailyLimitSeconds += totalExtendedMinutes * 60;
    }
    if (totalExtendedOpens > 0) {
      dailyOpenLimit += totalExtendedOpens;
    }

    const timeExceeded =
      hasTimeLimit && usageStats.timeSpentSeconds >= dailyLimitSeconds;
    const opensExceeded =
      hasOpenLimit && usageStats.opens >= dailyOpenLimit;

    if (timeExceeded || opensExceeded) {
      let limitType = 'unknown';
      if (timeExceeded && opensExceeded) {
        limitType = 'both';
      } else if (timeExceeded) {
        limitType = 'time';
      } else if (opensExceeded) {
        limitType = 'opens';
      }

      const reason = _generateBlockingReason(
        limitConfig,
        usageStats,
        timeExceeded,
        opensExceeded,
        isInGroup,
        groupName
      );

      return {
        shouldBlock: true,
        siteId: matchingSite.id,
        reason: reason,
        limitType: limitType,
      };
    }

    return {
      shouldBlock: false,
      siteId: matchingSite.id,
      reason: null,
      limitType: null,
    };
  } catch (error) {
    console.error('[SiteBlocker] Error checking site block status:', error);
    // On error, don't block to avoid accidentally restricting access
    return { shouldBlock: false, siteId: null, reason: null, limitType: null };
  }
}

export async function checkOpenLimitBeforeAccess(url) {
  if (!url) {
    return { wouldExceed: false, siteId: null, currentOpens: 0, limit: 0 };
  }

  try {
    // Get all distracting sites
    const distractingSites = await getDistractingSites();

    // Find a matching site that is enabled and has an open limit
    const matchingSite = findMatchingSite(
      url,
      distractingSites,
      (site) => site.isEnabled !== false && !!site.dailyOpenLimit
    );

    if (!matchingSite) {
      return { wouldExceed: false, siteId: null, currentOpens: 0, limit: 0 };
    }

    // Get today's usage stats
    const dateString = _getCurrentDateString();
    const dailyStats = await getUsageStats(dateString);
    const siteStats = dailyStats[matchingSite.id] || {
      timeSpentSeconds: 0,
      opens: 0,
    };

    // Check if we would exceed the open limit with one more open
    const wouldExceed = siteStats.opens + 1 > matchingSite.dailyOpenLimit;

    return {
      wouldExceed: wouldExceed,
      siteId: matchingSite.id,
      currentOpens: siteStats.opens,
      limit: matchingSite.dailyOpenLimit,
    };
  } catch (error) {
    console.error(
      '[SiteBlocker] Error checking open limit before access:',
      error
    );
    return { wouldExceed: false, siteId: null, currentOpens: 0, limit: 0 };
  }
}

/**
 * Builds the timeout page URL for a block result, carrying what the page needs
 * to explain itself (and to know a full block has no limit to extend).
 *
 * @param {string} url - The URL the user was trying to open.
 * @param {{siteId: string, reason: string, limitType: string}} result - From checkAndBlockSite.
 * @returns {string} The extension page URL to send the tab to.
 */
export function buildTimeoutUrl(url, { siteId, reason, limitType }) {
  return (
    browser.runtime.getURL('pages/timeout/index.html') +
    `?blockedUrl=${encodeURIComponent(url)}&siteId=${encodeURIComponent(siteId)}&reason=${encodeURIComponent(reason)}&limitType=${encodeURIComponent(limitType)}`
  );
}

export async function handlePotentialRedirect(tabId, url) {
  try {
    const result = await checkAndBlockSite(tabId, url);

    if (result.shouldBlock && result.siteId) {
      await browser.tabs.update(tabId, { url: buildTimeoutUrl(url, result) });
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `[SiteBlocker] Error in handlePotentialRedirect for tab ${tabId}:`,
      error
    );
    return false;
  }
}

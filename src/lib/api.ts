import { UISite, UIGroup, siteToStorage, groupToStorage, siteFromStorage, groupFromStorage } from './storage';

export interface BackgroundError {
  success: false;
  error: {
    message: string;
    type: string;
    isRetryable: boolean;
    field?: string;
  };
}

export interface BackgroundSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export type BackgroundResponse<T> = BackgroundSuccess<T> | BackgroundError;

export class APIError extends Error {
  constructor(
    message: string,
    public isRetryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function sendMessage<T = unknown>(
  action: string,
  payload?: unknown
): Promise<T> {
  try {
    const response: BackgroundResponse<T> = await browser.runtime.sendMessage({
      action,
      payload,
    });

    if (!response.success) {
      throw new APIError(
        response.error?.message || 'Unknown error from background script',
        response.error?.isRetryable || false
      );
    }

    return response.data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Failed to communicate with background script',
      true,
      error
    );
  }
}

export async function getMessages(): Promise<Array<Record<string, unknown>>> {
  return sendMessage('getTimeoutNotes');
}

export async function addMessage(text: string): Promise<Record<string, unknown>> {
  return sendMessage('addTimeoutNote', { text });
}

export async function updateMessage(id: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
  return sendMessage('updateTimeoutNote', { id, updates });
}

export async function deleteMessage(id: string): Promise<boolean> {
  const result = await sendMessage('deleteTimeoutNote', { id });
  return result.deleted === true;
}

export async function getSites(): Promise<UISite[]> {
  const result = await sendMessage<{ distractingSites: Record<string, unknown>[] }>('getAllSettings');
  const backendSites = result.distractingSites || [];
  return backendSites.map((site) => siteFromStorage(site as Record<string, unknown> & { id?: string; urlPattern: string }));
}

export async function addSite(uiSite: Partial<UISite>): Promise<UISite> {
  const backendSite = siteToStorage(uiSite as UISite);
  const { id, ...siteWithoutId } = backendSite;
  const result = await sendMessage<Record<string, unknown>>('addDistractingSite', siteWithoutId);
  return siteFromStorage(result as Record<string, unknown> & { id?: string; urlPattern: string });
}

export async function updateSite(
  id: string,
  updates: Partial<UISite>
): Promise<UISite> {
  const backendUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    backendUpdates.urlPattern = updates.name;
  }
  if ('timeLimit' in updates) {
    backendUpdates.dailyLimitSeconds = updates.timeLimit && updates.timeLimit > 0 ? updates.timeLimit * 60 : null;
  }
  if ('opensLimit' in updates) {
    backendUpdates.dailyOpenLimit = updates.opensLimit && updates.opensLimit > 0 ? updates.opensLimit : null;
  }
  if (updates.isEnabled !== undefined) {
    backendUpdates.isEnabled = updates.isEnabled;
  }
  if (updates.groupId !== undefined) {
    backendUpdates.groupId = updates.groupId;
  }

  const result = await sendMessage<Record<string, unknown>>('updateDistractingSite', {
    id,
    updates: backendUpdates,
  });
  return siteFromStorage(result as Record<string, unknown> & { id?: string; urlPattern: string });
}

export async function deleteSite(id: string): Promise<boolean> {
  const result = await sendMessage<Record<string, unknown>>('deleteDistractingSite', { id });
  return (result as Record<string, unknown>).deleted === true;
}

export async function getGroups(): Promise<UIGroup[]> {
  const [backendGroups, backendSites] = await Promise.all([
    sendMessage<Record<string, unknown>[]>('getGroups'),
    sendMessage<{ distractingSites: Record<string, unknown>[] }>('getAllSettings').then((r) => r.distractingSites || []),
  ]);

  const sitesMap = new Map<string, Record<string, unknown>>(backendSites.map((s) => [s.id as string, s]));
  return backendGroups.map((group) => groupFromStorage(group as Record<string, unknown> & { id: string }, sitesMap));
}

export async function addGroup(uiGroup: Partial<UIGroup>): Promise<UIGroup> {
  const backendGroup = groupToStorage(uiGroup as UIGroup);
  const { id, ...groupWithoutId } = backendGroup;
  const result = await sendMessage<Record<string, unknown>>('addGroup', groupWithoutId);
  const sitesMap = new Map<string, Record<string, unknown>>();
  return groupFromStorage(result as Record<string, unknown> & { id: string }, sitesMap);
}

export async function updateGroup(
  id: string,
  updates: Partial<UIGroup>
): Promise<UIGroup> {
  const backendUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    backendUpdates.name = updates.name;
  }
  if (updates.color !== undefined) {
    backendUpdates.color = updates.color;
  }
  if ('timeLimit' in updates) {
    if (updates.timeLimit && updates.timeLimit > 0) {
      backendUpdates.dailyLimitSeconds = updates.timeLimit * 60;
    } else {
      backendUpdates.dailyLimitSeconds = null;
    }
  }
  if ('opensLimit' in updates) {
    if (updates.opensLimit && updates.opensLimit > 0) {
      backendUpdates.dailyOpenLimit = updates.opensLimit;
    } else {
      backendUpdates.dailyOpenLimit = null;
    }
  }
  if (updates.isEnabled !== undefined) {
    backendUpdates.isEnabled = updates.isEnabled;
  }

  const result = await sendMessage<Record<string, unknown>>('updateGroup', {
    id,
    updates: backendUpdates,
  });

  const backendSites = await sendMessage<{ distractingSites: Record<string, unknown>[] }>('getAllSettings').then(
    (r) => r.distractingSites || []
  );
  const sitesMap = new Map<string, Record<string, unknown>>(backendSites.map((s) => [s.id as string, s]));

  return groupFromStorage(result as Record<string, unknown> & { id: string }, sitesMap);
}

export async function deleteGroup(id: string): Promise<boolean> {
  const result = await sendMessage<Record<string, unknown>>('deleteGroup', { id });
  return (result as Record<string, unknown>).deleted === true;
}

export async function addSiteToGroup(
  groupId: string,
  siteId: string
): Promise<UIGroup> {
  const result = await sendMessage<Record<string, unknown>>('addSiteToGroup', { groupId, siteId });
  const backendSites = await sendMessage<{ distractingSites: Record<string, unknown>[] }>('getAllSettings').then(
    (r) => r.distractingSites || []
  );
  const sitesMap = new Map<string, Record<string, unknown>>(backendSites.map((s) => [s.id as string, s]));
  return groupFromStorage(result as Record<string, unknown> & { id: string }, sitesMap);
}

export async function removeSiteFromGroup(
  groupId: string,
  siteId: string
): Promise<UIGroup> {
  const result = await sendMessage<Record<string, unknown>>('removeSiteFromGroup', { groupId, siteId });
  const backendSites = await sendMessage<{ distractingSites: Record<string, unknown>[] }>('getAllSettings').then(
    (r) => r.distractingSites || []
  );
  const sitesMap = new Map<string, Record<string, unknown>>(backendSites.map((s) => [s.id as string, s]));
  return groupFromStorage(result as Record<string, unknown> & { id: string }, sitesMap);
}

export async function getCurrentPageInfo(): Promise<Record<string, unknown>> {
  return sendMessage('getCurrentPageLimitInfo');
}

export async function addQuickLimit(
  urlPattern: string,
  dailyLimitSeconds: number
): Promise<UISite> {
  const result = await sendMessage<Record<string, unknown>>('addQuickLimit', {
    urlPattern,
    dailyLimitSeconds,
  });
  return siteFromStorage(result as Record<string, unknown> & { id?: string; urlPattern: string });
}

export async function getRandomTimeoutNote(): Promise<Record<string, unknown>> {
  return sendMessage('getRandomTimeoutNote');
}

export async function refreshCurrentPageData(): Promise<Record<string, unknown>> {
  return sendMessage('refreshCurrentPageData');
}

export async function getBadgeInfo(url: string): Promise<Record<string, unknown>> {
  return sendMessage('getBadgeInfo', { url });
}

export async function getSystemStatus(): Promise<Record<string, unknown>> {
  return sendMessage('getSystemStatus');
}

export async function getDisplayPreferences(): Promise<Record<string, unknown>> {
  return sendMessage('getDisplayPreferences');
}

export async function updateDisplayPreferences(preferences: Record<string, unknown>): Promise<Record<string, unknown>> {
  return sendMessage('updateDisplayPreferences', preferences);
}

export async function extendLimit(
  siteId: string,
  extendedMinutes: number,
  extendedOpens: number,
  excuse: string
): Promise<{ siteId: string; extensionData: Record<string, unknown> }> {
  return sendMessage('extendLimit', {
    siteId,
    extendedMinutes,
    extendedOpens,
    excuse,
  });
}

export async function getOnboardingState(): Promise<{ completed: boolean } | null> {
  try {
    return await sendMessage('getOnboardingState');
  } catch (error) {
    // If onboarding state doesn't exist, return null
    return null;
  }
}

export async function completeOnboarding(): Promise<{ completed: boolean }> {
  return sendMessage('completeOnboarding');
}

export async function bootstrapDefaultData(): Promise<{
  groupAdded: boolean;
  messagesAdded: boolean;
}> {
  return sendMessage('bootstrapDefaultData');
}

export interface RatingState {
  hasRated: boolean;
  declineCount: number;
  lastPromptDate: string | null;
  nextPromptAfter: string | null;
  shouldShow: boolean;
}

export async function getRatingState(): Promise<RatingState> {
  return sendMessage('getRatingState');
}

export async function markRated(): Promise<void> {
  await sendMessage('markRated');
}

export async function declineRating(): Promise<void> {
  await sendMessage('declineRating');
}

export async function recordRatingPromptShown(): Promise<void> {
  await sendMessage('recordRatingPromptShown');
}

export function listenForBroadcasts(
  callback: (event: string, data: unknown) => void
): () => void {
  const handleMessage = (message: unknown) => {
    if (typeof message === 'object' && message !== null && (message as Record<string, unknown>).type === 'BROADCAST') {
      callback((message as Record<string, unknown>).event as string, (message as Record<string, unknown>).data);
    }
  };

  browser.runtime.onMessage.addListener(handleMessage);
  return () => {
    browser.runtime.onMessage.removeListener(handleMessage);
  };
}

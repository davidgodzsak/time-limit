import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { UIGroup } from "@/lib/storage";
import { useBroadcastUpdates } from "@/hooks/useBroadcastUpdates";
import { useToggleSelection } from "@/lib/hooks/useToggleSelection";
import { getErrorMessage, logError, getErrorToastProps, getSuccessToastProps } from "@/lib/utils/errorHandler";
import { t } from "@/lib/utils/i18n";
import { getRatingUrl } from "@/lib/constants/rating";
import { NormalPageView } from "./popup/NormalPageView";
import { UnlimitedSiteView } from "./popup/UnlimitedSiteView";
import { DisabledStateView } from "./popup/DisabledStateView";
import { TimeoutPageView } from "./popup/TimeoutPageView";
import { SettingsPageView } from "./popup/SettingsPageView";
import { InfoPageView } from "./popup/InfoPageView";
import { FirstInstallView } from "./popup/FirstInstallView";
import { RatingPromptView } from "./popup/RatingPromptView";

const PluginPopup = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Current page data
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isLimited, setIsLimited] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState<'site' | 'group' | 'both' | null>(null);
  const [siteName, setSiteName] = useState<string>("");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [timeUsed, setTimeUsed] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [opensUsed, setOpensUsed] = useState(0);
  const [opensLimit, setOpensLimit] = useState(0);
  const [pageType, setPageType] = useState<'normal' | 'timeout' | 'settings' | 'info'>('normal');

  // Preset selection state (using custom hook to reduce duplication)
  const [selectedTimeLimit, toggleTimeLimit, resetTimeLimitSelection] = useToggleSelection<number>(null);
  const [selectedOpensLimit, toggleOpensLimit, resetOpensLimitSelection] = useToggleSelection<number>(null);

  // Group selection state
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<UIGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Timeout page state (needed for passing to view component)
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [originalTimeLimit, setOriginalTimeLimit] = useState(0);
  const [originalOpensLimit, setOriginalOpensLimit] = useState(0);

  // Onboarding state
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);
  const [skipFirstInstallView, setSkipFirstInstallView] = useState(false);

  // Rating prompt state
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

  // Load current page info on mount
  useEffect(() => {
    const loadPageInfo = async () => {
      try {
        setIsLoading(true);
        const pageInfo = await api.getCurrentPageInfo();

        // Extract hostname from URL and detect extension pages
        try {
          const url = new URL(pageInfo.url);
          setCurrentUrl(pageInfo.url);

          // Detect extension pages
          if (pageInfo.url.includes('timeout.html') || pageInfo.url.includes('timeout/index.html')) {
            setSiteName('Timeout Page');
            setPageType('timeout');
            setIsLimited(false);

            // Extract params from URL
            const urlParams = new URLSearchParams(pageInfo.url.split('?')[1]);
            const extractedSiteId = urlParams.get('siteId');
            const extractedBlockedUrl = urlParams.get('blockedUrl');

            if (extractedSiteId) {
              setSiteId(extractedSiteId);
            }
            if (extractedBlockedUrl) {
              setBlockedUrl(extractedBlockedUrl);
            }

            return;
          }
          if (pageInfo.url.includes('settings.html') || pageInfo.url.includes('settings/index.html')) {
            setSiteName('Settings Page');
            setPageType('settings');
            setIsLimited(false);
            return;
          }
          if (pageInfo.url.includes('info.html') || pageInfo.url.includes('info/index.html')) {
            setSiteName('Info Page');
            setPageType('info');
            setIsLimited(false);
            return;
          }

          setSiteName(url.hostname);
          setPageType('normal');
        } catch {
          setCurrentUrl(pageInfo.url);
          setSiteName(pageInfo.hostname || "unknown");
          setPageType('normal');
        }

        if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
          // Check if site/group is disabled
          const siteIsEnabled = pageInfo.siteInfo.isEnabled !== false;
          const groupIsEnabled = pageInfo.siteInfo.groupInfo ? pageInfo.siteInfo.groupInfo.isEnabled : true;

          const siteDisabled = !siteIsEnabled;
          const groupDisabled = !groupIsEnabled;

          setSiteId(pageInfo.siteInfo.id);
          setGroupId(pageInfo.siteInfo.groupId || null);
          setGroupName(pageInfo.siteInfo.groupId ? pageInfo.siteInfo.groupInfo?.name : null);

          // Determine disabled reason
          if (siteDisabled || groupDisabled) {
            setIsDisabled(true);
            if (siteDisabled && groupDisabled) {
              setDisabledReason('both');
            } else if (groupDisabled) {
              setDisabledReason('group');
            } else {
              setDisabledReason('site');
            }
            setIsLimited(false);
          } else {
            // Both enabled - show tracking info
            setIsDisabled(false);
            setDisabledReason(null);
            setIsLimited(true);

            // Convert seconds to minutes (handle undefined)
            const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
            const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
            const usedMinutes = Math.ceil(
              (pageInfo.siteInfo.todaySeconds || 0) / 60
            );

            setTimeLimit(limitMinutes);
            setTimeUsed(usedMinutes);
            setOpensLimit(pageInfo.siteInfo.dailyOpenLimit || 0);
            setOpensUsed(pageInfo.siteInfo.todayOpenCount || 0);

            // Check if rating should show on limited sites (after 4+ days)
            try {
              const ratingState = await api.getRatingState();
              if (ratingState.shouldShow) {
                setShowRatingPrompt(true);
                try { await api.recordRatingPromptShown(); } catch { /* non-critical */ }
              }
            } catch { /* non-critical */ }
          }
        } else {
          setIsLimited(false);
          setIsDisabled(false);
          setDisabledReason(null);
        }
      } catch (error) {
        console.error('[PluginPopup] Exception in loadPageInfo:', error);
        logError("Error loading page info", error);
        toast(getErrorToastProps(t("popup_pageInfo_error")));
      } finally {
        setIsLoading(false);
      }
    };

    loadPageInfo();

    // Check if onboarding is completed
    const checkOnboardingState = async () => {
      try {
        const onboardingData = await api.getOnboardingState();
        setOnboardingCompleted(onboardingData?.completed || false);
      } catch (error) {
        console.warn("Could not check onboarding state:", error);
      }
    };

    checkOnboardingState();
  }, [toast]);

  // When on timeout page with siteId, fetch the site limits to show original values
  useEffect(() => {
    if (pageType === 'timeout' && siteId) {
      const fetchSiteLimits = async () => {
        try {
          const sites = await api.getSites();
          const site = sites.find((s) => s.id === siteId);
          if (site) {
            setOriginalTimeLimit(site.timeLimit || 0);
            setOriginalOpensLimit(site.opensLimit || 0);
          }
        } catch (error) {
          logError('Error fetching site limits', error);
        }
      };
      fetchSiteLimits();
    }
  }, [pageType, siteId]);


  // Listen for real-time updates
  useBroadcastUpdates({
    siteAdded: async () => {
      // Refresh page data when new site is added (might be current site)
      try {
        const pageInfo = await api.getCurrentPageInfo();
        if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
          setIsLimited(true);
          const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
          const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
          const usedMinutes = Math.ceil((pageInfo.siteInfo.todaySeconds || 0) / 60);
          setTimeLimit(limitMinutes);
          setTimeUsed(usedMinutes);
        }
      } catch (error) {
        console.warn("Could not refresh page info after site added:", error);
      }
    },
    siteUpdated: (data) => {
      if (siteId && data.site.id === siteId) {
        const limitSeconds = data.site.dailyLimitSeconds || 0;
        const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
        setTimeLimit(limitMinutes);
      }
    },
  });

  // Periodic update of remaining time on limited sites
  useEffect(() => {
    if (!isLimited) return;

    const updateInterval = setInterval(async () => {
      try {
        const pageInfo = await api.getCurrentPageInfo();
        if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
          const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
          const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
          const usedMinutes = Math.ceil((pageInfo.siteInfo.todaySeconds || 0) / 60);
          setTimeLimit(limitMinutes);
          setTimeUsed(usedMinutes);
        }
      } catch (error) {
        console.warn("Could not update time remaining:", error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [isLimited]);

  const handleSelectTimeLimit = (minutes: number) => {
    toggleTimeLimit(minutes);
  };

  const handleSelectOpensLimit = (opens: number) => {
    toggleOpensLimit(opens);
  };

  const handleAddLimit = async () => {
    if (!selectedTimeLimit && !selectedOpensLimit) {
      toast(getErrorToastProps(t("popup_addLimit_validation")));
      return;
    }

    try {
      setIsSaving(true);
      // Add site with both time and opens limits
      await api.addSite({
        name: siteName,
        timeLimit: selectedTimeLimit ?? undefined,
        opensLimit: selectedOpensLimit ?? undefined,
      });

      toast(getSuccessToastProps(t("popup_addLimit_success", siteName)));

      // Reset selection
      resetTimeLimitSelection();
      resetOpensLimitSelection();

      // Refresh page info
      const pageInfo = await api.getCurrentPageInfo();
      if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
        setIsLimited(true);
        const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
        const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
        const usedMinutes = Math.ceil((pageInfo.siteInfo.todaySeconds || 0) / 60);
        setTimeLimit(limitMinutes);
        setTimeUsed(usedMinutes);
        setOpensLimit(pageInfo.siteInfo.dailyOpenLimit || 0);
        setOpensUsed(pageInfo.siteInfo.todayOpenCount || 0);
      }

      // Check if rating prompt should be shown after successful limit add
      try {
        const ratingState = await api.getRatingState();
        if (ratingState.shouldShow) {
          setShowRatingPrompt(true);
          try { await api.recordRatingPromptShown(); } catch { /* non-critical */ }
        }
      } catch { /* non-critical */ }
    } catch (error) {
      logError("Error adding limit", error);
      toast(getErrorToastProps(t("popup_addLimit_failed")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSettings = () => {
    browser.runtime.openOptionsPage().catch(() => {
      // Fallback: open settings page directly
      browser.tabs.create({
        url: browser.runtime.getURL("ui/settings/settings.html"),
      });
    });
  };

  const handleOpenInfo = () => {
    browser.tabs.create({
      url: browser.runtime.getURL("pages/info/index.html"),
    });
  };

  const handleTurnOnSite = async () => {
    if (!siteId) return;
    try {
      setIsSaving(true);

      // Enable site if it's disabled
      if (disabledReason === 'site' || disabledReason === 'both') {
        await api.updateSite(siteId, { isEnabled: true });
      }

      // Enable group if it's disabled
      if ((disabledReason === 'group' || disabledReason === 'both') && groupId) {
        await api.updateGroup(groupId, { isEnabled: true });
      }

      setIsDisabled(false);
      setDisabledReason(null);
      setIsLimited(true);

      toast(getSuccessToastProps(t("popup_trackingEnabled_description"), t("popup_trackingEnabled_title")));

      // Refresh page info to show tracking details
      const pageInfo = await api.getCurrentPageInfo();
      if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
        const siteEnabled = pageInfo.siteInfo.isEnabled !== false;
        const groupEnabled = pageInfo.siteInfo.groupInfo ? pageInfo.siteInfo.groupInfo.isEnabled : true;

        if (siteEnabled && groupEnabled) {
          const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
          const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
          const usedMinutes = Math.ceil((pageInfo.siteInfo.todaySeconds || 0) / 60);
          setTimeLimit(limitMinutes);
          setTimeUsed(usedMinutes);
          setOpensLimit(pageInfo.siteInfo.dailyOpenLimit || 0);
          setOpensUsed(pageInfo.siteInfo.todayOpenCount || 0);
        }
      }
    } catch (error) {
      logError("Error enabling tracking", error);
      toast(getErrorToastProps(t("popup_trackingEnabled_failed")));
    } finally {
      setIsSaving(false);
    }
  };

  const openGroupSelector = async () => {
    try {
      setIsLoadingGroups(true);
      const groups = await api.getGroups();
      setAvailableGroups(groups);
      setShowGroupSelector(true);
    } catch (error) {
      logError("Error loading groups", error);
      toast(getErrorToastProps(t("popup_groupSelector_error")));
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    try {
      setIsSaving(true);

      // Determine which site to add to group
      const siteToAddId = siteId || (await api.addSite({
        name: siteName,
        // Don't set any limits, just add the site
      })).id;

      // Add site to group
      await api.addSiteToGroup(groupId, siteToAddId);

      toast(getSuccessToastProps(t("popup_addToGroup_success")));

      // Refresh page info
      const pageInfo = await api.getCurrentPageInfo();
      if (pageInfo.isDistractingSite && pageInfo.siteInfo) {
        setIsLimited(true);
        setGroupName(pageInfo.siteInfo.groupId ? "Group" : null);
        setGroupId(pageInfo.siteInfo.groupId || null);
        setSiteId(pageInfo.siteInfo.id);
        const limitSeconds = pageInfo.siteInfo.dailyLimitSeconds || 0;
        const limitMinutes = limitSeconds > 0 ? Math.ceil(limitSeconds / 60) : 0;
        const usedMinutes = Math.ceil((pageInfo.siteInfo.todaySeconds || 0) / 60);
        setTimeLimit(limitMinutes);
        setTimeUsed(usedMinutes);
        setOpensLimit(pageInfo.siteInfo.dailyOpenLimit || 0);
        setOpensUsed(pageInfo.siteInfo.todayOpenCount || 0);
      }

      setShowGroupSelector(false);
      resetTimeLimitSelection();
      resetOpensLimitSelection();
    } catch (error) {
      logError("Error adding site to group", error);
      toast(getErrorToastProps(t("popup_addToGroup_failed")));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExtendLimit = async (minutes: number, opens: number, excuse: string) => {
    try {
      if (!siteId) {
        throw new Error("Site ID not found");
      }

      await api.extendLimit(siteId, minutes, opens, excuse);

      toast(getSuccessToastProps(t("notification_extendSuccess")));

      // Navigate back to original site if we have the URL
      if (blockedUrl) {
        setTimeout(() => {
          browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs && tabs[0] && tabs[0].id) {
              browser.tabs.update(tabs[0].id, { url: decodeURIComponent(blockedUrl) });
            }
          });
        }, 500);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      logError("Error extending limit", error);
      toast(getErrorToastProps(message));
      throw error;
    }
  };

  const handleRateNow = async () => {
    try {
      await api.markRated();
      const ratingUrl = getRatingUrl();
      browser.tabs.create({ url: ratingUrl });
      toast(getSuccessToastProps(t("popup_rating_thankYou")));
      setShowRatingPrompt(false);
    } catch (error) {
      logError("Error rating extension", error);
      toast(getErrorToastProps(t("popup_rating_error")));
    }
  };

  const handleAlreadyRated = async () => {
    try {
      await api.markRated();
      toast(getSuccessToastProps(t("popup_rating_thankYou")));
      setShowRatingPrompt(false);
    } catch (error) {
      logError("Error marking rated", error);
      toast(getErrorToastProps(t("popup_rating_error")));
    }
  };

  const handleDismissRating = async () => {
    try {
      await api.declineRating();
      setShowRatingPrompt(false);
    } catch (error) {
      logError("Error dismissing rating prompt", error);
      toast(getErrorToastProps(t("popup_rating_error")));
    }
  };

  const timeRemaining = Math.max(0, timeLimit - timeUsed);
  const opensRemaining = opensLimit > 0 ? Math.max(0, opensLimit - opensUsed) : 0;

  if (isLoading) {
    return (
      <Card className="w-80 shadow-soft border-0 overflow-hidden">
        <div className="gradient-mint p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-foreground">Time Limit</div>
            <div className="w-6 h-6" />
          </div>
        </div>
        <CardContent className="p-5 flex items-center justify-center min-h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("popup_loading_message")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show UI for disabled sites/groups (turn-on option)
  if (isDisabled && siteId) {
    return (
      <DisabledStateView
        siteName={siteName}
        disabledReason={disabledReason}
        groupName={groupName}
        isSaving={isSaving}
        onTurnOnSite={handleTurnOnSite}
        onOpenSettings={handleOpenSettings}
      />
    );
  }

  // Show first-install welcome when onboarding is not completed and on normal page
  if (!onboardingCompleted && pageType === 'normal' && !skipFirstInstallView) {
    return (
      <FirstInstallView
        onOpenSettings={handleOpenSettings}
        onAddLimit={() => setSkipFirstInstallView(true)}
      />
    );
  }

  // Show rating prompt if conditions are met
  if (showRatingPrompt && pageType === 'normal') {
    return (
      <RatingPromptView
        onRate={handleRateNow}
        onAlreadyRated={handleAlreadyRated}
        onDismiss={handleDismissRating}
      />
    );
  }

  if (!isLimited) {
    if (pageType === 'timeout') {
      return (
        <TimeoutPageView
          originalTimeLimit={originalTimeLimit}
          originalOpensLimit={originalOpensLimit}
          siteId={siteId}
          blockedUrl={blockedUrl}
          isSaving={false}
          onExtendLimit={handleExtendLimit}
          onOpenSettings={handleOpenSettings}
          onOpenInfo={handleOpenInfo}
        />
      );
    }

    if (pageType === 'settings') {
      return <SettingsPageView onOpenSettings={handleOpenSettings} onOpenInfo={handleOpenInfo} />;
    }

    if (pageType === 'info') {
      return <InfoPageView onOpenSettings={handleOpenSettings} />;
    }

    // Unlimited site - show quick add UI
    return (
      <UnlimitedSiteView
        siteName={siteName}
        selectedTimeLimit={selectedTimeLimit}
        selectedOpensLimit={selectedOpensLimit}
        showGroupSelector={showGroupSelector}
        isLoadingGroups={isLoadingGroups}
        availableGroups={availableGroups}
        isSaving={isSaving}
        onSelectTimeLimit={handleSelectTimeLimit}
        onSelectOpensLimit={handleSelectOpensLimit}
        onAddLimit={handleAddLimit}
        onOpenGroupSelector={openGroupSelector}
        onAddToGroup={handleAddToGroup}
        onCloseGroupSelector={() => setShowGroupSelector(false)}
        onOpenSettings={handleOpenSettings}
        onInfo={handleOpenInfo}
      />
    );
  }

  // Tracked site - check if rating should show first
  if (showRatingPrompt && pageType === 'normal' && isLimited) {
    return (
      <RatingPromptView
        onRate={handleRateNow}
        onAlreadyRated={handleAlreadyRated}
        onDismiss={handleDismissRating}
      />
    );
  }

  // Show time/opens remaining
  return (
    <NormalPageView
      siteName={siteName}
      groupName={groupName}
      timeUsed={timeUsed}
      timeLimit={timeLimit}
      timeRemaining={timeRemaining}
      opensUsed={opensUsed}
      opensLimit={opensLimit}
      opensRemaining={opensRemaining}
      onSettings={handleOpenSettings}
      onInfo={handleOpenInfo}
    />
  );
};

export default PluginPopup;

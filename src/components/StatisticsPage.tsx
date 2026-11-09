import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Info, LayoutGrid, List, Loader2, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { t } from "@/lib/utils/i18n";
import { getVersionFromManifest } from "@/lib/utils/manifestVersion";
import { getErrorToastProps, getSuccessToastProps, logError } from "@/lib/utils/errorHandler";
import { openInfoPage, openSettingsPage } from "@/lib/utils/navigation";
import {
  MIN_DAYS_FOR_STATS,
  RANGES,
  buildRules,
  buildTimeline,
  sliceRange,
  toCsv,
  type RangeDays,
  type RuleInfo,
} from "@/lib/stats/aggregate";
import { formatMinutes } from "@/lib/stats/format";
import PageTemplate from "./PageTemplate";
import { OverviewTab } from "./stats/OverviewTab";
import { SitesTab } from "./stats/SitesTab";
import { LimitsTab } from "./stats/LimitsTab";
import { PatternsTab } from "./stats/PatternsTab";
import { PrivacyNote } from "./stats/PrivacyNote";
import { NotEnoughDataView } from "./stats/NotEnoughDataView";
import { StatsFooter } from "./stats/StatsFooter";
import { SegmentedControl } from "./stats/SegmentedControl";

/** Remembers the chosen range per viewer; purely a convenience. */
const RANGE_KEY = "statsRange";
function initialRange(): RangeDays {
  try {
    const saved = Number(localStorage.getItem(RANGE_KEY));
    return (RANGES as readonly number[]).includes(saved) ? (saved as RangeDays) : 7;
  } catch {
    return 7;
  }
}

const StatisticsPage = () => {
  const { toast } = useToast();
  const [data, setData] = useState<api.StatisticsData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [range, setRange] = useState<RangeDays>(initialRange);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api.getStatistics());
      setLoadFailed(false);
    } catch (error) {
      logError("Error loading statistics", error);
      setLoadFailed(true);
      toast(getErrorToastProps(t("stats_loadFailed")));
    }
  }, [toast]);

  useEffect(() => {
    load();
    getVersionFromManifest().then(setVersion);
    // Coming back to the tab shows the minutes spent elsewhere since.
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const derived = useMemo(() => {
    if (!data) return null;
    return { rules: buildRules(data), timeline: buildTimeline(data) };
  }, [data]);
  const slice = useMemo(() => (derived ? sliceRange(derived.timeline, range) : null), [derived, range]);

  const changeRange = (value: RangeDays) => {
    setRange(value);
    try {
      localStorage.setItem(RANGE_KEY, String(value));
    } catch {
      // Private windows may refuse storage; the range just won't be remembered.
    }
  };

  const runAction = async (action: () => Promise<unknown>, success: string, failure: string) => {
    setIsSaving(true);
    try {
      await action();
      toast(getSuccessToastProps(success));
      await load();
    } catch (error) {
      logError("Statistics action failed", error);
      toast(getErrorToastProps(failure));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPause = (host: string) =>
    runAction(
      async () => {
        await api.addSite({ name: host, reflectionDelay: 10 });
        await api.dismissLimitSuggestion(host);
      },
      t("stats_frequent_added", host),
      t("popup_addLimit_failed")
    );

  const handleDismissHost = (host: string) =>
    runAction(() => api.dismissLimitSuggestion(host), t("stats_frequent_dismissed", host), t("stats_actionFailed"));

  const handleTightenLimit = (rule: RuleInfo, minutes: number) =>
    runAction(
      () => (rule.kind === "group" ? api.updateGroup(rule.id, { timeLimit: minutes }) : api.updateSite(rule.id, { timeLimit: minutes })),
      t("stats_fit_updated", [rule.name, formatMinutes(minutes)]),
      t("stats_actionFailed")
    );

  const handleExport = () => {
    if (!data || !derived) return;
    const full = buildTimeline(data, Math.max(derived.timeline.trackedDays, 1));
    const blob = new Blob([toCsv(full, derived.rules)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time-limit-statistics-${data.today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => runAction(() => api.clearStatistics(), t("stats_cleared"), t("stats_actionFailed"));

  const enoughData = !!derived && derived.timeline.trackedDays >= MIN_DAYS_FOR_STATS;
  const shownDays = slice?.cur.length ?? 0;

  return (
    <PageTemplate
      version={version}
      headerAction="settings"
      onHeaderAction={openSettingsPage}
      extraHeaderLinks={[{ icon: Info, title: t("normalPageView_button_tooltip"), onClick: openInfoPage }]}
    >
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{t("stats_title")}</h1>
            <p className="text-foreground/70 mt-1">{t("stats_subtitle")}</p>
          </div>
          {enoughData && (
            <SegmentedControl
              label={t("stats_range_label")}
              value={range}
              onChange={changeRange}
              options={RANGES.map((days) => ({ value: days, label: t("stats_range_days", String(days)) }))}
            />
          )}
        </div>

        <PrivacyNote />

        {!data && !loadFailed && (
          <div className="flex justify-center py-16 text-muted-foreground" aria-live="polite">
            <Loader2 className="animate-spin" aria-label={t("stats_loading")} />
          </div>
        )}

        {loadFailed && !data && <p className="py-16 text-center text-foreground/70">{t("stats_loadFailed")}</p>}

        {data && derived && !enoughData && (
          <NotEnoughDataView
            firstDate={derived.timeline.firstDate}
            hasRules={data.sites.length > 0}
            onOpenSettings={openSettingsPage}
          />
        )}

        {data && derived && slice && enoughData && (
          <>
            {shownDays < range && <p className="text-sm text-muted-foreground -mt-2">{t("stats_range_clipped", String(shownDays))}</p>}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 rounded-2xl p-1 bg-muted/80">
                <TabsTrigger value="overview" className="rounded-xl">
                  <Activity size={16} className="mr-2 hidden sm:block" />
                  {t("stats_tab_overview")}
                </TabsTrigger>
                <TabsTrigger value="sites" className="rounded-xl">
                  <List size={16} className="mr-2 hidden sm:block" />
                  {t("stats_tab_sites")}
                </TabsTrigger>
                <TabsTrigger value="limits" className="rounded-xl">
                  <ShieldCheck size={16} className="mr-2 hidden sm:block" />
                  {t("stats_tab_limits")}
                </TabsTrigger>
                <TabsTrigger value="patterns" className="rounded-xl">
                  <LayoutGrid size={16} className="mr-2 hidden sm:block" />
                  {t("stats_tab_patterns")}
                </TabsTrigger>
              </TabsList>
              {/* Keyed by range so the charts animate in again when it changes. */}
              <TabsContent value="overview" key={`o${range}`}>
                <OverviewTab slice={slice} points={derived.timeline.points} rules={derived.rules} />
              </TabsContent>
              <TabsContent value="sites" key={`s${range}`}>
                <SitesTab
                  slice={slice}
                  rules={derived.rules}
                  frequentHosts={data.frequentHosts}
                  onAddPause={handleAddPause}
                  onDismissHost={handleDismissHost}
                  isSaving={isSaving}
                />
              </TabsContent>
              <TabsContent value="limits" key={`l${range}`}>
                <LimitsTab slice={slice} rules={derived.rules} onTightenLimit={handleTightenLimit} isSaving={isSaving} />
              </TabsContent>
              <TabsContent value="patterns" key={`p${range}`}>
                <PatternsTab slice={slice} points={derived.timeline.points} rules={derived.rules} />
              </TabsContent>
            </Tabs>
            <StatsFooter onExport={handleExport} onClear={handleClear} isSaving={isSaving} />
          </>
        )}
      </div>
    </PageTemplate>
  );
};

export default StatisticsPage;

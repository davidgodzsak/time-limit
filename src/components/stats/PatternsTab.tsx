import { useState } from "react";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import { BASELINE_WEEKS, hourGrid, streaks, weekdayAverages, weeklyTrend, type DayPoint, type RangeSlice, type RuleInfo } from "@/lib/stats/aggregate";
import { formatMinutes, formatNumber, formatWeekday } from "@/lib/stats/format";
import { HourHeatmap } from "./HourHeatmap";
import { WeeklyTrendChart } from "./WeeklyTrendChart";
import { STATS_CARD } from "./styles";

interface PatternsTabProps {
  slice: RangeSlice;
  points: DayPoint[];
  rules: Record<string, RuleInfo>;
}

const ALL = "__all";

export function PatternsTab({ slice, points, rules }: PatternsTabProps) {
  const [filter, setFilter] = useState(ALL);
  const ids = filter === ALL ? Object.keys(rules) : [filter];
  const grid = hourGrid(slice.cur, ids);
  const weekdays = weekdayAverages(slice.cur);
  const busiest = weekdays.reduce((a, b) => (b.value > a.value ? b : a));
  const maxWeekday = Math.max(1, ...weekdays.map((w) => w.value));
  const trend = weeklyTrend(points);
  const run = streaks(points);

  return (
    <div className="space-y-6">
      <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">{t("stats_heatmap_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("stats_heatmap_description")}</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t("stats_heatmap_filter")}
            className="rounded-xl border border-input bg-white/80 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={ALL}>{t("stats_heatmap_all")}</option>
            {Object.values(rules).map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </div>
        <HourHeatmap grid={grid} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className={`${STATS_CARD} p-5 sm:p-6 md:col-span-3 stats-fade-up`} style={{ animationDelay: "60ms" }}>
          <h2 className="text-lg font-semibold">{t("stats_weekly_title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("stats_weekly_description")}</p>
          {trend.baseline !== null ? (
            <WeeklyTrendChart trend={{ ...trend, baseline: trend.baseline }} />
          ) : (
            <p className="py-10 text-center text-sm text-foreground/70">
              {t("stats_weekly_notYet", [String(BASELINE_WEEKS + 1), String(trend.weeks.length)])}
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {trend.baseline !== null && (
              <div>
                <div className="text-2xl font-semibold tabular-nums text-emerald-700">{formatMinutes(trend.reclaimed)}</div>
                <div className="text-muted-foreground">{t("stats_weekly_reclaimed")}</div>
              </div>
            )}
            <div>
              <div className="text-2xl font-semibold tabular-nums">{formatNumber(run.current)}</div>
              <div className="text-muted-foreground">{t("stats_kpi_streak")}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">{formatNumber(run.best)}</div>
              <div className="text-muted-foreground">{t("stats_streak_best")}</div>
            </div>
          </div>
        </Card>

        <Card className={`${STATS_CARD} p-5 sm:p-6 md:col-span-2 stats-fade-up`} style={{ animationDelay: "120ms" }}>
          <h2 className="text-lg font-semibold">{t("stats_weekday_title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {busiest.value > 0 ? t("stats_weekday_busiest", [formatWeekday(busiest.dow, "long"), formatMinutes(busiest.value)]) : t("stats_weekday_description")}
          </p>
          <div className="space-y-2">
            {weekdays.map((w, k) => (
              <div key={w.dow} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-muted-foreground">{formatWeekday(w.dow)}</span>
                <div className="flex-1 h-5 rounded-md bg-secondary/70 overflow-hidden">
                  <div
                    className="h-full rounded-md stats-grow-x"
                    style={{
                      width: `${(w.value / maxWeekday) * 100}%`,
                      background: w.dow === busiest.dow && w.value > 0 ? "hsl(158 64% 42%)" : "hsl(155 36% 82%)",
                      animationDelay: `${k * 60}ms`,
                    }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums">{formatMinutes(w.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

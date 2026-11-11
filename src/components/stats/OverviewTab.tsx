import { useState } from "react";
import { Ban, Clock, Flame, Hourglass, Lightbulb, MousePointerClick, ShieldCheck, Timer, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import {
  avg,
  insights as findInsights,
  maWindowFor,
  streaks,
  sum,
  totalOf,
  type DayPoint,
  type Insight,
  type Mode,
  type RangeSlice,
  type RuleInfo,
} from "@/lib/stats/aggregate";
import { formatHour, formatMinutes, formatNumber, formatPercent } from "@/lib/stats/format";
import { KpiCard } from "./KpiCard";
import { Delta } from "./Delta";
import { SegmentedControl } from "./SegmentedControl";
import { StackedAreaChart } from "./StackedAreaChart";
import { STATS_CARD } from "./styles";

interface OverviewTabProps {
  slice: RangeSlice;
  points: DayPoint[];
  rules: Record<string, RuleInfo>;
}

const heldBack = (days: DayPoint[]) => sum(days, (d) => sum(Object.values(d.rules), (r) => r.b + r.pd));

export function OverviewTab({ slice, points, rules }: OverviewTabProps) {
  const [mode, setMode] = useState<Mode>("time");
  const { cur, prev, prior, hasPrev } = slice;
  const n = cur.length;
  const timeNow = avg(cur, (d) => totalOf(d, "time"));
  const timeBefore = hasPrev ? avg(prev, (d) => totalOf(d, "time")) : null;
  const opensNow = avg(cur, (d) => totalOf(d, "opens"));
  const opensBefore = hasPrev ? avg(prev, (d) => totalOf(d, "opens")) : null;
  const run = streaks(points);
  const found = findInsights(rules, slice);

  let comparison = "";
  if (timeBefore !== null) {
    const diff = (timeBefore - timeNow) * n;
    if (diff >= 5) comparison = t("stats_summary_less", [formatMinutes(diff), String(n)]);
    else if (diff <= -5) comparison = t("stats_summary_more", [formatMinutes(-diff), String(n)]);
    else comparison = t("stats_summary_same");
  }

  return (
    <div className="space-y-6">
      <Card className={`${STATS_CARD} p-6 stats-fade-up`}>
        <p className="text-lg leading-relaxed text-foreground/85 max-w-[62ch]">
          {t("stats_summary", [String(n), formatMinutes(timeNow * n), formatMinutes(timeNow)])} {comparison}
        </p>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Clock size={16} />} label={t("stats_kpi_timePerDay")} value={timeNow} format={formatMinutes} footer={<Delta current={timeNow} previous={timeBefore} />} />
        <KpiCard
          icon={<MousePointerClick size={16} />}
          label={t("stats_kpi_opensPerDay")}
          value={opensNow}
          format={(v) => formatNumber(v)}
          footer={<Delta current={opensNow} previous={opensBefore} />}
          delayMs={60}
        />
        <KpiCard
          icon={<ShieldCheck size={16} />}
          label={t("stats_kpi_heldBack")}
          value={heldBack(cur)}
          format={(v) => formatNumber(v)}
          footer={<span className="text-xs text-muted-foreground">{t("stats_kpi_heldBack_hint")}</span>}
          delayMs={120}
        />
        <KpiCard
          icon={<Flame size={16} />}
          label={t("stats_kpi_streak")}
          value={run.current}
          format={(v) => formatNumber(v)}
          footer={<span className="text-xs text-muted-foreground">{t("stats_kpi_streak_best", String(run.best))}</span>}
          delayMs={180}
        />
      </div>

      <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`} style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{t("stats_daily_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-[60ch]">{t("stats_daily_description", String(maWindowFor(n)))}</p>
          </div>
          <SegmentedControl
            label={t("stats_daily_title")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "time", label: t("stats_mode_time") },
              { value: "opens", label: t("stats_mode_opens") },
            ]}
          />
        </div>
        {sum(cur, (d) => totalOf(d, mode)) > 0 ? (
          <StackedAreaChart cur={cur} prior={prior} rules={rules} mode={mode} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("stats_daily_empty")}</p>
        )}
      </Card>

      {found.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Lightbulb size={18} aria-hidden="true" />
            {t("stats_insights_title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {found.map((insight, k) => (
              <InsightCard key={insight.kind} insight={insight} rules={rules} delayMs={200 + k * 70} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TONES = {
  good: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  neutral: "bg-blue-100 text-blue-600",
};

function InsightCard({ insight, rules, delayMs }: { insight: Insight; rules: Record<string, RuleInfo>; delayMs: number }) {
  const name = "ruleId" in insight ? rules[insight.ruleId]?.name ?? "" : "";
  let Icon = Lightbulb;
  let tone: keyof typeof TONES = "neutral";
  let title = "";
  let text = "";
  switch (insight.kind) {
    case "drop":
      Icon = TrendingDown;
      tone = "good";
      title = t("stats_insight_drop_title", [name, formatPercent(insight.pct)]);
      text = t("stats_insight_drop_text", [formatMinutes(insight.now), formatMinutes(insight.before)]);
      break;
    case "tight":
      Icon = Hourglass;
      tone = "warn";
      title = t("stats_insight_tight_title", [name, String(insight.hits), String(insight.days)]);
      text = t("stats_insight_tight_text");
      break;
    case "attempts":
      Icon = Ban;
      tone = insight.before !== null && insight.now > insight.before ? "warn" : "good";
      title = t("stats_insight_attempts_title", [name, String(insight.now)]);
      text =
        insight.before === null
          ? t("stats_insight_attempts_text")
          : insight.now <= insight.before
            ? t("stats_insight_attempts_fewer", String(insight.before))
            : t("stats_insight_attempts_more", String(insight.before));
      break;
    case "pause":
      Icon = Timer;
      tone = "good";
      title = t("stats_insight_pause_title", [name, formatPercent(insight.pct)]);
      text = t("stats_insight_pause_text", [String(insight.turnedDown), String(insight.total)]);
      break;
    case "peakHour":
      Icon = Clock;
      title = t("stats_insight_peak_title", formatHour(insight.hour));
      text = t("stats_insight_peak_text", formatPercent(insight.pct));
      break;
  }
  return (
    <Card className={`${STATS_CARD} p-5 flex gap-4 stats-fade-up`} style={{ animationDelay: `${delayMs}ms` }}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{title}</div>
        <p className="text-sm text-foreground/70 mt-1">{text}</p>
      </div>
    </Card>
  );
}

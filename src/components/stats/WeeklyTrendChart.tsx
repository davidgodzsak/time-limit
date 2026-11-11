import { useState } from "react";
import { t } from "@/lib/utils/i18n";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { monotonePath, niceStep } from "@/lib/stats/monotone";
import type { WeeklyTrend } from "@/lib/stats/aggregate";
import { formatDay, formatMinutes } from "@/lib/stats/format";
import { ChartTooltip } from "./ChartTooltip";
import { ACCENT_DARK, GRID, INK, INK_MUTED } from "./styles";

/**
 * Average minutes per day for each week, against the first month: green where
 * the week came in under it, amber where it went over, a ring on weeks with an
 * extension. Only drawn once there is a baseline.
 */
export function WeeklyTrendChart({ trend }: { trend: WeeklyTrend & { baseline: number } }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const { weeks, baseline } = trend;
  const n = weeks.length;

  const height = 230;
  const m = { l: 48, r: 12, t: 22, b: 28 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const top = Math.max(1, baseline, ...weeks.map((w) => w.value)) * 1.1;
  const step = niceStep(top, "time");
  const yMax = Math.ceil(top / step) * step;
  const x = (i: number) => m.l + (i / (n - 1)) * iw;
  const y = (v: number) => m.t + ih - (v / yMax) * ih;
  const yb = y(baseline);
  const line = monotonePath(weeks.map((w, i) => [x(i), y(w.value)]));
  const area = `${line}L${x(n - 1)},${yb}L${x(0)},${yb}Z`;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - m.l) / iw) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };
  const hw = hover !== null ? weeks[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg width={width} height={height} role="img" aria-label={t("stats_weekly_aria")} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block">
        <defs>
          <clipPath id="stats-week-below">
            <rect x={0} y={yb} width={width} height={height} />
          </clipPath>
          <clipPath id="stats-week-above">
            <rect x={0} y={0} width={width} height={yb} />
          </clipPath>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeDasharray={v ? "3 4" : undefined} />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED} className="tabular-nums">
              {formatMinutes(v)}
            </text>
          </g>
        ))}
        <g className="stats-fade-up" style={{ animationDelay: "600ms" }}>
          <path d={area} fill="hsl(155 55% 70% / .55)" clipPath="url(#stats-week-below)" />
          <path d={area} fill="hsl(38 92% 60% / .35)" clipPath="url(#stats-week-above)" />
        </g>
        <line x1={m.l} x2={width - m.r} y1={yb} y2={yb} stroke={INK} strokeOpacity={0.55} strokeDasharray="5 4" />
        <text x={width - m.r} y={yb - 6} textAnchor="end" fontSize={11} fill={INK} fontWeight={500}>
          {t("stats_weekly_baseline", formatMinutes(baseline))}
        </text>
        <path d={line} fill="none" stroke={ACCENT_DARK} strokeWidth={2} strokeLinejoin="round" pathLength={1} className="stats-draw" />
        {weeks.map((w, i) =>
          w.extensions > 0 ? (
            <circle key={w.start} cx={x(i)} cy={y(w.value)} r={4} fill="#fff" stroke="#c98500" strokeWidth={2} className="stats-pop" style={{ animationDelay: `${900 + i * 25}ms` }} />
          ) : null
        )}
        {hw && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={INK} strokeOpacity={0.3} />
            <circle cx={x(hover)} cy={y(hw.value)} r={4.5} fill={ACCENT_DARK} stroke="#fff" strokeWidth={2} />
          </g>
        )}
        {weeks.map((w, i) =>
          (n - 1 - i) % 4 === 0 ? (
            <text key={w.start} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
              {formatDay(w.start)}
            </text>
          ) : null
        )}
      </svg>
      {hw && hover !== null && (
        <ChartTooltip x={x(hover)} chartWidth={width} width={190}>
          <div className="font-semibold mb-1">{t("stats_weekly_weekOf", formatDay(hw.start))}</div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stats_weekly_perDay")}</span>
            <span className="tabular-nums font-semibold">{formatMinutes(hw.value)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stats_weekly_vsBaseline")}</span>
            <span className={`tabular-nums font-semibold ${hw.value <= baseline ? "text-emerald-700" : "text-amber-700"}`}>
              {hw.value <= baseline ? "−" : "+"}
              {formatMinutes(Math.abs(baseline - hw.value))}
            </span>
          </div>
          {hw.extensions > 0 && <div className="mt-1 text-amber-700">{t("stats_weekly_extensions", String(hw.extensions))}</div>}
        </ChartTooltip>
      )}
    </div>
  );
}

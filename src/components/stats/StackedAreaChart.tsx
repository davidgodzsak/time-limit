import { useState } from "react";
import { t } from "@/lib/utils/i18n";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import { monotonePath, niceStep } from "@/lib/stats/monotone";
import { maWindowFor, movingAverage, sum, totalOf, valueOf, type DayPoint, type Mode, type RuleInfo } from "@/lib/stats/aggregate";
import { formatDay, formatMinutes, formatNumber, formatWeekday } from "@/lib/stats/format";
import { ChartTooltip } from "./ChartTooltip";
import { GRID, INK, INK_MUTED, SHADES } from "./styles";

interface StackedAreaChartProps {
  cur: DayPoint[];
  prior: DayPoint[];
  rules: Record<string, RuleInfo>;
  mode: Mode;
}

/** Most bands drawn; the rest fold into one "other" band so the shades stay tellable apart. */
const MAX_BANDS = 5;
const OTHER = "__other";

/**
 * Daily time (or opens) stacked by site, busiest at the bottom in the darkest
 * mint, with the moving average of the total drawn on top.
 */
export function StackedAreaChart({ cur, prior, rules, mode }: StackedAreaChartProps) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [band, setBand] = useState<string | null>(null);

  const n = cur.length;
  const narrow = width < 560;
  const win = maWindowFor(n);
  const ids = Object.keys(rules)
    .map((id) => ({ id, total: sum(cur, (d) => valueOf(d, id, mode)) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((r) => r.id);
  const shown = ids.length > MAX_BANDS ? ids.slice(0, MAX_BANDS - 1) : ids;
  const folded = ids.slice(shown.length);
  const series = [
    ...shown.map((id) => ({ id, name: rules[id].name, vals: cur.map((d) => valueOf(d, id, mode)) })),
    ...(folded.length
      ? [{ id: OTHER, name: t("stats_chart_other"), vals: cur.map((d) => sum(folded, (id) => valueOf(d, id, mode))) }]
      : []),
  ].map((s, k) => ({ ...s, shade: SHADES[k] }));

  const totals = cur.map((d) => totalOf(d, mode));
  const ma = movingAverage(cur, prior, mode, win);
  const top = Math.max(1, ...totals, ...ma) * 1.08;
  const step = niceStep(top, mode);
  const yMax = Math.ceil(top / step) * step;

  const height = 280;
  const m = { l: 48, r: narrow ? 14 : 150, t: 16, b: 30 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = height - m.t - m.b;
  const x = (i: number) => m.l + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = (v: number) => m.t + ih - (v / yMax) * ih;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);
  const labelEvery = n <= 7 ? 1 : n <= 30 ? 5 : 14;
  const fmt = (v: number) => (mode === "time" ? formatMinutes(v) : formatNumber(v));

  let lower = cur.map(() => 0);
  const layers = series.map((s) => {
    const upper = lower.map((l, i) => l + s.vals[i]);
    const up = monotonePath(upper.map((v, i) => [x(i), y(v)]));
    const down = monotonePath(lower.map((v, i) => [x(i), y(v)] as [number, number]).reverse()).replace(/^M/, "L");
    const layer = { ...s, lower, upper, d: `${up}${down}Z` };
    lower = upper;
    return layer;
  });

  // Direct labels at the right edge, nudged apart so they never overlap.
  const labels = layers
    .map((l) => ({ id: l.id, name: l.name, shade: l.shade, y: y((l.lower[n - 1] + l.upper[n - 1]) / 2) }))
    .sort((a, b) => b.y - a.y);
  for (let k = 1; k < labels.length; k++) {
    if (labels[k - 1].y - labels[k].y < 15) labels[k].y = labels[k - 1].y - 15;
  }

  const maPath = monotonePath(ma.map((v, i) => [x(i), y(v)]));
  const dim = (id: string) => (band && band !== id ? 0.3 : 1);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - m.l) / iw) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };
  const short = (s: string) => (s.length > 18 ? `${s.slice(0, 17)}…` : s);

  return (
    <div>
      {narrow && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-foreground/80">
          {series.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: s.shade }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full select-none">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={t(mode === "time" ? "stats_chart_daily_aria_time" : "stats_chart_daily_aria_opens", String(win))}
          onMouseMove={onMove}
          onMouseLeave={() => {
            setHover(null);
            setBand(null);
          }}
          className="block"
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={y(v)} y2={y(v)} stroke={GRID} strokeDasharray={v ? "3 4" : undefined} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED} className="tabular-nums">
                {fmt(v)}
              </text>
            </g>
          ))}
          <g key={`${n}-${mode}`}>
            <g className="stats-grow">
              {layers.map((l) => (
                <path
                  key={l.id}
                  d={l.d}
                  fill={l.shade}
                  stroke="#fff"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  opacity={dim(l.id)}
                  style={{ transition: "opacity .2s" }}
                  onMouseEnter={() => setBand(l.id)}
                />
              ))}
            </g>
            <path d={maPath} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" pathLength={1} className="stats-draw" />
            <path d={maPath} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" pathLength={1} className="stats-draw" />
            <circle cx={x(n - 1)} cy={y(ma[n - 1])} r={4.5} fill={INK} stroke="#fff" strokeWidth={2} className="stats-pop" style={{ animationDelay: "1.3s" }} />
          </g>
          {!narrow &&
            labels.map((l) => (
              <g key={l.id} opacity={dim(l.id)} onMouseEnter={() => setBand(l.id)} style={{ transition: "opacity .2s" }}>
                <rect x={m.l + iw + 10} y={l.y - 5} width={10} height={10} rx={3} fill={l.shade} />
                <text x={m.l + iw + 26} y={l.y + 4} fontSize={12} fill={INK}>
                  {short(l.name)}
                </text>
              </g>
            ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={INK} strokeOpacity={0.4} />
              {layers.map((l) => (
                <circle key={l.id} cx={x(hover)} cy={y(l.upper[hover])} r={3} fill="#fff" stroke={INK} strokeWidth={1.5} />
              ))}
            </g>
          )}
          {cur.map((d, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <text key={d.date} x={x(i)} y={height - 10} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
                {n <= 7 ? formatWeekday(d.dow) : formatDay(d.date)}
              </text>
            ) : null
          )}
          <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke="hsl(155 20% 75%)" />
        </svg>
        {hover !== null && (
          <ChartTooltip x={x(hover)} chartWidth={width}>
            <div className="font-semibold text-foreground mb-2">
              {formatWeekday(cur[hover].dow)}, {formatDay(cur[hover].date)}
            </div>
            {[...layers].reverse().map((l) => (
              <div key={l.id} className={`flex items-center gap-2 py-0.5 ${band === l.id ? "font-semibold" : ""}`}>
                <span className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: l.shade }} />
                <span className="truncate text-foreground/80">{l.name}</span>
                <span className="ml-auto tabular-nums text-foreground">{fmt(l.vals[hover])}</span>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-border flex justify-between">
              <span className="text-muted-foreground">{t("stats_chart_total")}</span>
              <span className="tabular-nums font-semibold">{fmt(totals[hover])}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("stats_chart_average", String(win))}</span>
              <span className="tabular-nums font-semibold">{fmt(ma[hover])}</span>
            </div>
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}

import { t } from "@/lib/utils/i18n";
import { useElementWidth } from "@/lib/hooks/useElementWidth";
import type { LimitFit } from "@/lib/stats/aggregate";
import { formatMinutes } from "@/lib/stats/format";
import { ACCENT, GRID, INK, INK_MUTED } from "./styles";

/** One dot per day of use along an axis, with the limit as a line. */
export function FitStrip({ fit, limit }: { fit: LimitFit; limit: number }) {
  const [ref, width] = useElementWidth();
  const height = 34;
  const pad = 8;
  const max = Math.max(limit * 1.15, fit.max * 1.05);
  const x = (v: number) => pad + (v / max) * (width - 2 * pad);
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height + 16} aria-hidden="true" className="block">
        <line x1={pad} x2={width - pad} y1={height / 2} y2={height / 2} stroke={GRID} strokeWidth={6} strokeLinecap="round" />
        {fit.values.map((v, i) => (
          <circle
            key={i}
            cx={x(v)}
            cy={height / 2 + (((i * 7) % 5) - 2) * 2.2}
            r={4}
            fill={ACCENT}
            fillOpacity={0.75}
            stroke="#fff"
            strokeWidth={1.5}
            className="stats-pop"
            style={{ animationDelay: `${i * 8}ms` }}
          />
        ))}
        <line x1={x(limit)} x2={x(limit)} y1={2} y2={height - 2} stroke={INK} strokeWidth={2} />
        <text x={x(limit)} y={height + 12} textAnchor="middle" fontSize={11} fill={INK} fontWeight={600}>
          {t("stats_fit_limitLabel", formatMinutes(limit))}
        </text>
        <text x={pad} y={height + 12} fontSize={11} fill={INK_MUTED}>
          {formatMinutes(0)}
        </text>
      </svg>
    </div>
  );
}

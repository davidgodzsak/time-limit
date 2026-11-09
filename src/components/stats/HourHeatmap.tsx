import { useState } from "react";
import { t } from "@/lib/utils/i18n";
import { formatHour, formatNumber, formatWeekday } from "@/lib/stats/format";
import { RAMP, rampColor } from "./styles";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Weekday × hour grid of average opens and attempts. */
export function HourHeatmap({ grid }: { grid: number[][] }) {
  const [cell, setCell] = useState<{ dow: number; hour: number; value: number } | null>(null);
  const max = Math.max(0.01, ...grid.flat());
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px] grid gap-[3px]" style={{ gridTemplateColumns: "40px repeat(24, minmax(0, 1fr))" }}>
          {ORDER.map((dow, row) => (
            <div key={dow} className="contents">
              <div className="text-xs text-muted-foreground flex items-center">{formatWeekday(dow)}</div>
              {grid[dow].map((value, hour) => (
                <div
                  key={hour}
                  onMouseEnter={() => setCell({ dow, hour, value })}
                  onMouseLeave={() => setCell(null)}
                  className="aspect-square rounded-[4px] stats-pop"
                  style={{
                    background: rampColor(value / max),
                    animationDelay: `${(row * 24 + hour) * 3}ms`,
                    outline: cell && cell.dow === dow && cell.hour === hour ? "2px solid hsl(160 25% 15%)" : "none",
                  }}
                />
              ))}
            </div>
          ))}
          <div />
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="text-[10px] text-muted-foreground text-center tabular-nums">
              {hour % 3 === 0 ? hour : ""}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground min-h-[20px]">
        <span className="text-foreground/80">
          {cell
            ? t("stats_heatmap_cell", [formatWeekday(cell.dow, "long"), formatHour(cell.hour), formatNumber(cell.value, 1)])
            : t("stats_heatmap_hint")}
        </span>
        <span className="inline-flex items-center gap-1">
          {t("stats_heatmap_fewer")}
          {RAMP.map((c) => (
            <span key={c} className="w-3 h-3 rounded-[3px] inline-block" style={{ background: c }} />
          ))}
          {t("stats_heatmap_more")}
        </span>
      </div>
    </div>
  );
}

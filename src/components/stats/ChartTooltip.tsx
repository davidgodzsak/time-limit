import type { ReactNode } from "react";

interface ChartTooltipProps {
  /** Centre x in pixels inside the chart; kept clear of both edges. */
  x: number;
  chartWidth: number;
  width?: number;
  children: ReactNode;
}

/** The floating card every chart shows on hover. */
export function ChartTooltip({ x, chartWidth, width = 230, children }: ChartTooltipProps) {
  const left = Math.min(Math.max(x, width / 2), chartWidth - width / 2);
  return (
    <div
      className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl bg-white/95 backdrop-blur shadow-lg border border-border p-3 text-xs"
      style={{ left, width }}
    >
      {children}
    </div>
  );
}

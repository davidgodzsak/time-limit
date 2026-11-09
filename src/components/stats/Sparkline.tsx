import { ACCENT } from "./styles";

/** A small trend line with an area fill and the latest value emphasised. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const n = values.length;
  const pts = values.map((v, i) => [(i / (n - 1)) * (width - 4) + 2, height - 3 - (v / max) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const last = pts[n - 1];
  return (
    <svg width={width} height={height} aria-hidden="true" className="block">
      <path d={`${d}L${last[0]},${height}L2,${height}Z`} fill="hsl(155 38% 90% / .7)" />
      <path d={d} fill="none" stroke="hsl(160 10% 55%)" strokeWidth={1.5} strokeLinejoin="round" pathLength={1} className="stats-draw" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={ACCENT} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

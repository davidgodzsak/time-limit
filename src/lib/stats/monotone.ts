/**
 * SVG path through points with monotone cubic interpolation (Fritsch–Carlson):
 * smooth, and never overshoots between points — so a curve of daily minutes
 * never dips below zero or bulges above a peak that did not happen.
 */
export function monotonePath(points: Array<[number, number]>): string {
  const n = points.length;
  if (n === 0) return "";
  const f = (v: number) => v.toFixed(1);
  if (n === 1) return `M${f(points[0][0])},${f(points[0][1])}`;
  const dx: number[] = [];
  const m: number[] = [];
  const t: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    m[i] = (points[i + 1][1] - points[i][1]) / dx[i];
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(points[i][0] + h)},${f(points[i][1] + t[i] * h)} ${f(points[i + 1][0] - h)},${f(points[i + 1][1] - t[i + 1] * h)} ${f(points[i + 1][0])},${f(points[i + 1][1])}`;
  }
  return d;
}

/** A tick step for a value axis, so it carries at most ~4 lines. */
export function niceStep(max: number, mode: "time" | "opens"): number {
  const steps = mode === "time" ? [5, 10, 15, 20, 30, 60, 90, 120, 180, 240, 360] : [1, 2, 5, 10, 20, 25, 50, 100, 200];
  return steps.find((s) => max / s <= 4) ?? steps[steps.length - 1];
}

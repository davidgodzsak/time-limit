/** Shared look for the statistics page, matching the Info and Settings cards. */
export const STATS_CARD = "border-0 shadow-soft bg-white/80 backdrop-blur";

/** Mint shades for stacked bands, darkest (busiest) first. One hue: names, not colours, tell sites apart. */
export const SHADES = [
  "hsl(160 70% 26%)",
  "hsl(158 58% 37%)",
  "hsl(157 48% 50%)",
  "hsl(156 44% 64%)",
  "hsl(155 40% 78%)",
  "hsl(154 36% 88%)",
];

/** Sequential ramp for the hour heatmap, empty → busy. */
export const RAMP = ["#eef8f3", "#cdeedd", "#9fdcbf", "#5fc39a", "#2da677", "#1a8a61", "#0f6e4c"];
export const rampColor = (k: number) => RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(k * (RAMP.length - 1))))];

export const ACCENT = "hsl(158 64% 42%)";
export const ACCENT_DARK = "hsl(160 70% 30%)";
export const INK = "hsl(160 25% 15%)";
export const INK_MUTED = "hsl(160 10% 45%)";
export const GRID = "hsl(155 25% 88%)";

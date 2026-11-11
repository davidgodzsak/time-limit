/**
 * Number, duration and date formatting for the statistics page, in the user's
 * chosen language. `Intl` knows every locale's units and month names, so none
 * of this needs a translation key.
 */
import { getCurrentLanguage } from "@/lib/utils/i18n";
import { parseDate } from "./aggregate";

const locale = () => getCurrentLanguage().replace("_", "-");

const unit = (u: "hour" | "minute", n: number) =>
  new Intl.NumberFormat(locale(), { style: "unit", unit: u, unitDisplay: "narrow" }).format(n);

/** Minutes as "1h 12m" / "38m" (localized units). */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return unit("minute", m);
  return m ? `${unit("hour", h)} ${unit("minute", m)}` : unit("hour", h);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }).format(n);
}

/** 0.42 → "42%". */
export function formatPercent(ratio: number): string {
  return new Intl.NumberFormat(locale(), { style: "percent", maximumFractionDigits: 0 }).format(Math.abs(ratio));
}

/** "2026-11-09" → "Nov 9". */
export function formatDay(key: string): string {
  return new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric" }).format(parseDate(key));
}

/** 0 → "Sun" (2026-11-08 was a Sunday). */
export function formatWeekday(dow: number, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat(locale(), { weekday: style }).format(new Date(2026, 10, 8 + dow));
}

/** 22 → "22:00" in a 24h locale, "10 PM" in a 12h one. */
export function formatHour(hour: number): string {
  return new Intl.DateTimeFormat(locale(), { hour: "numeric" }).format(new Date(2026, 0, 1, hour));
}

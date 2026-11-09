/**
 * Turns the stored daily history into what the statistics page draws.
 *
 * Everything here is pure: the page loads `StatisticsData` once and derives the
 * rest, so these functions are where the arithmetic lives and gets tested.
 *
 * Rows are *rules*, not sites: a site that was in a group on a given day counts
 * towards that group (the `g` stored with the day), the same way the limits
 * counted it at the time.
 */
import type { HistoryExtension, StatisticsData } from "@/lib/api";

/** Below this many recorded days the page asks the user to come back later. */
export const MIN_DAYS_FOR_STATS = 3;
/** Weeks of history before the six-month trend has a first month to compare with. */
export const BASELINE_WEEKS = 4;
export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];
export type Mode = "time" | "opens";

export interface RuleInfo {
  id: string;
  name: string;
  kind: "group" | "site";
  /** Url patterns of the group's current members. */
  members: string[];
  /** Current limits, in minutes / opens / seconds; absent when not set. */
  timeLimit?: number;
  openLimit?: number;
  pause?: number;
  blocked: boolean;
  /** False when the site or group has since been deleted. */
  exists: boolean;
}

export interface RuleDay {
  /** Minutes. */
  t: number;
  o: number;
  b: number;
  pp: number;
  pd: number;
  /** Opens and attempts per hour, 24 slots. */
  h: number[];
}

export interface DayPoint {
  date: string;
  dow: number;
  rules: Record<string, RuleDay>;
  ext: HistoryExtension[];
  /** False for days before the first recorded one. */
  tracked: boolean;
}

export interface Timeline {
  points: DayPoint[];
  firstDate: string | null;
  trackedDays: number;
}

/* ───────────── dates ───────────── */

export function parseDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(key: string, days: number): string {
  const date = parseDate(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

/* ───────────── small helpers ───────────── */

export const sum = <T,>(items: T[], f: (x: T) => number): number => items.reduce((s, x) => s + f(x), 0);
export const avg = <T,>(items: T[], f: (x: T) => number): number => (items.length ? sum(items, f) / items.length : 0);

const emptyRuleDay = (): RuleDay => ({ t: 0, o: 0, b: 0, pp: 0, pd: 0, h: Array(24).fill(0) });

export function ruleDay(day: DayPoint, id: string): RuleDay {
  return day.rules[id] || emptyRuleDay();
}

export function valueOf(day: DayPoint, id: string, mode: Mode): number {
  const r = day.rules[id];
  if (!r) return 0;
  return mode === "time" ? r.t : r.o;
}

export function totalOf(day: DayPoint, mode: Mode): number {
  return sum(Object.values(day.rules), (r) => (mode === "time" ? r.t : r.o));
}

/* ───────────── rules ───────────── */

/**
 * Describes every rule that appears in the history, with its current limits.
 * Deleted sites and groups keep the name they had.
 */
export function buildRules(data: StatisticsData): Record<string, RuleInfo> {
  const ids = new Set<string>();
  for (const day of Object.values(data.days)) {
    for (const [siteId, entry] of Object.entries(day.s || {})) ids.add(entry.g || siteId);
  }

  const rules: Record<string, RuleInfo> = {};
  for (const id of ids) {
    const group = data.groups.find((g) => g.id === id);
    const site = data.sites.find((s) => s.id === id);
    const isGroup = !!group || (!site && id in (data.names.groups || {}));
    const config = group || site;
    rules[id] = {
      id,
      kind: isGroup ? "group" : "site",
      name: group?.name ?? site?.urlPattern ?? (isGroup ? data.names.groups?.[id] : data.names.sites?.[id]) ?? id,
      members: isGroup ? data.sites.filter((s) => s.groupId === id).map((s) => s.urlPattern) : [],
      timeLimit: config?.dailyLimitSeconds ? Math.ceil(config.dailyLimitSeconds / 60) : undefined,
      openLimit: config?.dailyOpenLimit || undefined,
      pause: config?.reflectionDelaySeconds || undefined,
      blocked: config?.isBlocked === true,
      exists: !!config,
    };
  }
  return rules;
}

/* ───────────── timeline ───────────── */

/**
 * One point per calendar day, oldest first, ending today and reaching back far
 * enough for the 90 day range, its previous period and a moving-average lead-in.
 * Days without data are present (and zero), so gaps are real gaps.
 */
export function buildTimeline(data: StatisticsData, lookbackDays = 2 * 90 + 7): Timeline {
  const recorded = Object.entries(data.days)
    .filter(([, day]) => Object.keys(day.s || {}).length > 0 || (day.x || []).length > 0)
    .map(([date]) => date)
    .sort();
  const firstDate = recorded[0] ?? null;
  const trackedDays = firstDate ? daysBetween(firstDate, data.today) + 1 : 0;

  const points: DayPoint[] = [];
  for (let k = lookbackDays - 1; k >= 0; k--) {
    const date = addDays(data.today, -k);
    const stored = data.days[date];
    const rules: Record<string, RuleDay> = {};
    for (const [siteId, entry] of Object.entries(stored?.s || {})) {
      const id = entry.g || siteId;
      const r = (rules[id] = rules[id] || emptyRuleDay());
      r.t += (entry.t || 0) / 60;
      r.o += entry.o || 0;
      r.b += entry.b || 0;
      r.pp += entry.pp || 0;
      r.pd += entry.pd || 0;
      for (const [hour, n] of Object.entries(entry.h || {})) r.h[Number(hour)] += n;
    }
    points.push({
      date,
      dow: parseDate(date).getDay(),
      rules,
      ext: stored?.x || [],
      tracked: firstDate !== null && date >= firstDate,
    });
  }
  return { points, firstDate, trackedDays };
}

export interface RangeSlice {
  /** The days shown, oldest first. Never reaches before the first recorded day. */
  cur: DayPoint[];
  /** The same number of days before `cur`, for comparisons. */
  prev: DayPoint[];
  /** Everything before `cur`, for the moving average lead-in. */
  prior: DayPoint[];
  /** Whether `prev` is fully inside the recorded history. */
  hasPrev: boolean;
}

export function sliceRange({ points, trackedDays }: Timeline, range: number): RangeSlice {
  const span = Math.max(1, Math.min(range, trackedDays));
  const cur = points.slice(-span);
  const prior = points.slice(0, -span);
  const prev = prior.slice(-span);
  return { cur, prev, prior, hasPrev: prev.length === span && prev[0].tracked };
}

/** Trailing moving average of the daily total, over recorded days only. */
export function movingAverage(cur: DayPoint[], prior: DayPoint[], mode: Mode, window: number): number[] {
  const all = [...prior.slice(-(window - 1)), ...cur];
  return cur.map((_, i) => {
    const slice = all.slice(i, i + window).filter((d) => d.tracked);
    return avg(slice, (d) => totalOf(d, mode));
  });
}

export const maWindowFor = (days: number): number => (days <= 7 ? 3 : 7);

/* ───────────── derived numbers ───────────── */

/** Days in a row without extending a limit — the current run and the best one. */
export function streaks(points: DayPoint[]): { current: number; best: number } {
  const tracked = points.filter((d) => d.tracked);
  let current = 0;
  for (let i = tracked.length - 1; i >= 0 && tracked[i].ext.length === 0; i--) current++;
  let best = 0;
  let run = 0;
  for (const d of tracked) {
    run = d.ext.length ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return { current, best };
}

export type FitTone = "tight" | "loose" | "fits";
export interface LimitFit {
  /** Minutes per day in the range. */
  values: number[];
  hits: number;
  max: number;
  tone: FitTone;
  /** A tighter limit that would still have covered 9 days in 10. */
  suggest?: number;
}

/** Days needed in the range before a limit's fit is worth judging. */
export const MIN_DAYS_FOR_FIT = 5;

/**
 * How a time limit sits against real use: reached most days ("tight"), never
 * close ("loose", with a tighter suggestion), or in between ("fits").
 */
export function limitFit(rule: RuleInfo, cur: DayPoint[]): LimitFit | null {
  const days = cur.filter((d) => d.tracked);
  if (!rule.timeLimit || days.length < MIN_DAYS_FOR_FIT) return null;
  const limit = rule.timeLimit;
  const values = days.map((d) => ruleDay(d, rule.id).t);
  const hits = values.filter((v) => v >= limit - 0.5).length;
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
  if (hits / values.length >= 0.5) return { values, hits, max, tone: "tight" };
  if (max < limit * 0.5) {
    const suggest = Math.max(5, Math.ceil((p90 * 1.25) / 5) * 5);
    if (suggest < limit) return { values, hits, max, tone: "loose", suggest };
  }
  return { values, hits, max, tone: "fits" };
}

export interface WeekPoint {
  start: string;
  /** Average minutes per day. */
  value: number;
  extensions: number;
}

export interface WeeklyTrend {
  weeks: WeekPoint[];
  /** Average minutes per day over the first BASELINE_WEEKS weeks; null until there are enough. */
  baseline: number | null;
  /** Minutes won back against the baseline since. */
  reclaimed: number;
}

/** Whole weeks (ending today) inside the recorded history, against the first month. */
export function weeklyTrend(points: DayPoint[], maxWeeks = 26): WeeklyTrend {
  const weeks: WeekPoint[] = [];
  for (let end = points.length; end - 7 >= 0 && weeks.length < maxWeeks; end -= 7) {
    const week = points.slice(end - 7, end);
    if (!week[0].tracked) break;
    weeks.unshift({
      start: week[0].date,
      value: avg(week, (d) => totalOf(d, "time")),
      extensions: sum(week, (d) => d.ext.length),
    });
  }
  if (weeks.length <= BASELINE_WEEKS) return { weeks, baseline: null, reclaimed: 0 };
  const baseline = avg(weeks.slice(0, BASELINE_WEEKS), (w) => w.value);
  const reclaimed = sum(weeks.slice(BASELINE_WEEKS), (w) => Math.max(0, baseline - w.value) * 7);
  return { weeks, baseline, reclaimed };
}

/** Average opens + attempts per weekday (0 = Sunday) and hour. */
export function hourGrid(cur: DayPoint[], ruleIds: string[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  const count = Array(7).fill(0);
  for (const day of cur.filter((d) => d.tracked)) {
    count[day.dow]++;
    for (const id of ruleIds) ruleDay(day, id).h.forEach((n, hour) => (grid[day.dow][hour] += n));
  }
  return grid.map((row, dow) => row.map((n) => n / (count[dow] || 1)));
}

/** Average minutes per weekday, Monday first. */
export function weekdayAverages(cur: DayPoint[]): Array<{ dow: number; value: number }> {
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
    dow,
    value: avg(cur.filter((d) => d.tracked && d.dow === dow), (d) => totalOf(d, "time")),
  }));
}

export interface RuleSummary {
  rule: RuleInfo;
  time: number;
  prevTime: number;
  opens: number;
  attempts: number;
  passed: number;
  turnedDown: number;
}

/** Totals per rule over the range, busiest first. */
export function summarizeRules(rules: Record<string, RuleInfo>, cur: DayPoint[], prev: DayPoint[]): RuleSummary[] {
  return Object.values(rules)
    .map((rule) => ({
      rule,
      time: sum(cur, (d) => ruleDay(d, rule.id).t),
      prevTime: sum(prev, (d) => ruleDay(d, rule.id).t),
      opens: sum(cur, (d) => ruleDay(d, rule.id).o),
      attempts: sum(cur, (d) => ruleDay(d, rule.id).b),
      passed: sum(cur, (d) => ruleDay(d, rule.id).pp),
      turnedDown: sum(cur, (d) => ruleDay(d, rule.id).pd),
    }))
    .filter((s) => s.time > 0 || s.opens > 0 || s.attempts > 0 || s.passed + s.turnedDown > 0)
    .sort((a, b) => b.time - a.time || b.attempts - a.attempts || b.opens - a.opens);
}

/* ───────────── insights ───────────── */

export type Insight =
  | { kind: "drop"; ruleId: string; pct: number; now: number; before: number }
  | { kind: "tight"; ruleId: string; hits: number; days: number }
  | { kind: "attempts"; ruleId: string; now: number; before: number | null }
  | { kind: "pause"; ruleId: string; pct: number; turnedDown: number; total: number }
  | { kind: "peakHour"; hour: number; pct: number };

/** The few things worth saying about a range, most useful first. At most four. */
export function insights(rules: Record<string, RuleInfo>, slice: RangeSlice): Insight[] {
  const { cur, prev, hasPrev } = slice;
  const out: Insight[] = [];
  const summaries = summarizeRules(rules, cur, prev);
  const days = cur.filter((d) => d.tracked).length;

  if (hasPrev) {
    const drops = summaries
      .filter((s) => s.prevTime / days >= 2)
      .map((s) => ({ s, pct: (s.time - s.prevTime) / s.prevTime }))
      .sort((a, b) => a.pct - b.pct);
    if (drops[0] && drops[0].pct <= -0.05) {
      const { s, pct } = drops[0];
      out.push({ kind: "drop", ruleId: s.rule.id, pct, now: s.time / days, before: s.prevTime / days });
    }
  }

  for (const s of summaries) {
    const fit = limitFit(s.rule, cur);
    if (fit?.tone === "tight") {
      out.push({ kind: "tight", ruleId: s.rule.id, hits: fit.hits, days: fit.values.length });
      break;
    }
  }

  const mostAttempted = [...summaries].sort((a, b) => b.attempts - a.attempts)[0];
  if (mostAttempted && mostAttempted.attempts > 0) {
    const before = hasPrev ? sum(prev, (d) => ruleDay(d, mostAttempted.rule.id).b) : null;
    out.push({ kind: "attempts", ruleId: mostAttempted.rule.id, now: mostAttempted.attempts, before });
  }

  const mostPaused = [...summaries].sort((a, b) => b.passed + b.turnedDown - (a.passed + a.turnedDown))[0];
  if (mostPaused && mostPaused.passed + mostPaused.turnedDown >= 5) {
    const total = mostPaused.passed + mostPaused.turnedDown;
    out.push({ kind: "pause", ruleId: mostPaused.rule.id, pct: mostPaused.turnedDown / total, turnedDown: mostPaused.turnedDown, total });
  }

  const hours = Array(24).fill(0);
  for (const day of cur) for (const r of Object.values(day.rules)) r.h.forEach((n, h) => (hours[h] += n));
  const totalHours = sum(hours, (n) => n);
  if (totalHours >= 10) {
    const hour = hours.indexOf(Math.max(...hours));
    out.push({ kind: "peakHour", hour, pct: hours[hour] / totalHours });
  }

  return out.slice(0, 4);
}

/* ───────────── export ───────────── */

/** The whole history as CSV, one row per day and rule. Minutes are rounded to one decimal. */
export function toCsv(timeline: Timeline, rules: Record<string, RuleInfo>): string {
  const header = ["date", "rule", "type", "minutes", "opens", "attempts_after_limit", "pauses_passed", "pauses_turned_down"];
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [header.join(",")];
  for (const day of timeline.points.filter((d) => d.tracked)) {
    for (const [id, r] of Object.entries(day.rules)) {
      const rule = rules[id];
      rows.push(
        [day.date, escape(rule?.name ?? id), rule?.kind ?? "site", r.t.toFixed(1), r.o, r.b, r.pp, r.pd].join(",")
      );
    }
  }
  return rows.join("\n") + "\n";
}

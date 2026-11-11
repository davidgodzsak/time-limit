import { describe, expect, it } from "vitest";
import type { StatisticsData } from "@/lib/api";
import {
  addDays,
  buildRules,
  buildTimeline,
  insights,
  limitFit,
  movingAverage,
  sliceRange,
  streaks,
  toCsv,
  weeklyTrend,
} from "./aggregate";

const TODAY = "2026-11-09";

/** History where youtube (site s1) is used `minutes(i)` on day i (0 = today). */
function data(days: number, minutes: (i: number) => number, extra: Partial<StatisticsData> = {}): StatisticsData {
  const out: StatisticsData["days"] = {};
  for (let i = 0; i < days; i++) {
    out[addDays(TODAY, -i)] = { s: { s1: { t: minutes(i) * 60, o: 2, h: { 22: 1 } } } };
  }
  return {
    today: TODAY,
    days: out,
    names: { sites: {}, groups: {} },
    sites: [{ id: "s1", urlPattern: "youtube.com", dailyLimitSeconds: 3600, isEnabled: true }],
    groups: [],
    frequentHosts: [],
    ...extra,
  };
}

describe("buildRules", () => {
  it("counts a grouped site towards its group, and names deleted rules from memory", () => {
    const d = data(1, () => 10);
    d.days[TODAY].s.s2 = { t: 60, g: "g1" };
    d.days[TODAY].s.gone = { t: 60 };
    d.groups = [{ id: "g1", name: "Social media", color: "blue", dailyLimitSeconds: 1800, isEnabled: true, siteIds: ["s2"] }];
    d.sites.push({ id: "s2", urlPattern: "instagram.com", groupId: "g1", isEnabled: true });
    d.names.sites.gone = "reddit.com";

    const rules = buildRules(d);
    expect(Object.keys(rules).sort()).toEqual(["g1", "gone", "s1"]);
    expect(rules.g1).toMatchObject({ kind: "group", name: "Social media", members: ["instagram.com"], timeLimit: 30 });
    expect(rules.gone).toMatchObject({ kind: "site", name: "reddit.com", exists: false });
  });
});

describe("timeline and ranges", () => {
  it("never shows days before the first recorded one", () => {
    const timeline = buildTimeline(data(10, () => 5));
    expect(timeline.trackedDays).toBe(10);
    const slice = sliceRange(timeline, 30);
    expect(slice.cur).toHaveLength(10);
    expect(slice.cur.every((d) => d.tracked)).toBe(true);
    expect(slice.hasPrev).toBe(false);
  });

  it("compares with the previous period once it is recorded", () => {
    const slice = sliceRange(buildTimeline(data(20, () => 5)), 7);
    expect(slice.cur).toHaveLength(7);
    expect(slice.hasPrev).toBe(true);
  });

  it("averages only recorded days, so the first days are not dragged to zero", () => {
    const timeline = buildTimeline(data(3, () => 30));
    const { cur, prior } = sliceRange(timeline, 7);
    expect(movingAverage(cur, prior, "time", 7)).toEqual([30, 30, 30]);
  });
});

describe("limitFit", () => {
  const rules = (d: StatisticsData) => buildRules(d);

  it("calls a limit reached on most days tight", () => {
    const d = data(7, (i) => (i < 5 ? 60 : 20));
    expect(limitFit(rules(d).s1, sliceRange(buildTimeline(d), 7).cur)).toMatchObject({ tone: "tight", hits: 5 });
  });

  it("suggests a tighter limit when use never comes close", () => {
    const d = data(10, () => 8);
    const fit = limitFit(rules(d).s1, sliceRange(buildTimeline(d), 7).cur);
    expect(fit).toMatchObject({ tone: "loose", suggest: 10 });
  });

  it("waits for enough days before judging", () => {
    const d = data(3, () => 8);
    expect(limitFit(rules(d).s1, sliceRange(buildTimeline(d), 7).cur)).toBeNull();
  });
});

describe("streaks", () => {
  it("counts days in a row without an extension", () => {
    const d = data(10, () => 5);
    d.days[addDays(TODAY, -3)].x = [{ id: "s1", m: 10, o: 0, r: "work" }];
    const { points } = buildTimeline(d);
    expect(streaks(points)).toEqual({ current: 3, best: 6 });
  });
});

describe("weeklyTrend", () => {
  it("has no baseline until there is a first month to compare with", () => {
    expect(weeklyTrend(buildTimeline(data(21, () => 5)).points).baseline).toBeNull();
  });

  it("measures time won back against the first four weeks", () => {
    // 6 weeks: the first four at 60 min/day, the last two at 30.
    const d = data(42, (i) => (i < 14 ? 30 : 60));
    const trend = weeklyTrend(buildTimeline(d).points);
    expect(trend.weeks).toHaveLength(6);
    expect(trend.baseline).toBe(60);
    expect(trend.reclaimed).toBe(2 * 7 * 30);
  });
});

describe("insights", () => {
  it("reports a drop against the previous period and a limit reached most days", () => {
    const d = data(14, (i) => (i < 7 ? 60 : 90));
    const found = insights(buildRules(d), sliceRange(buildTimeline(d), 7));
    expect(found[0]).toMatchObject({ kind: "drop", ruleId: "s1" });
    expect(found.find((x) => x.kind === "tight")).toMatchObject({ hits: 7, days: 7 });
  });
});

describe("toCsv", () => {
  it("writes one row per day and rule, quoting names that need it", () => {
    const d = data(1, () => 12.5);
    d.sites[0].urlPattern = 'odd,"name"';
    const csv = toCsv(buildTimeline(d), buildRules(d));
    expect(csv.split("\n")[1]).toBe(`${TODAY},"odd,""name""",site,12.5,2,0,0,0`);
  });
});

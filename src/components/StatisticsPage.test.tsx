import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { StatisticsData } from "@/lib/api";
import { addDays } from "@/lib/stats/aggregate";
import StatisticsPage from "./StatisticsPage";

/**
 * Smoke test: the whole page renders every tab from realistic data without
 * throwing. Strings come back as their keys (no i18n loaded), which is enough
 * to see what rendered.
 */

const TODAY = "2026-11-09";

function sampleData(days: number): StatisticsData {
  const out: StatisticsData["days"] = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(TODAY, -i);
    out[date] = {
      s: {
        yt: { t: (40 + (i % 5) * 6) * 60, o: 5, h: { 21: 3, 22: 2 } },
        ig: { t: 25 * 60, o: 8, b: i % 3, h: { 12: 4 }, g: "social" },
        shorts: { t: 10 * 60, o: 6, pp: 4, pd: 2, h: { 23: 6 } },
        x: { b: 2, h: { 9: 2 } },
      },
      ...(i % 9 === 0 ? { x: [{ id: "yt", m: 15, o: 0, r: "A long conference talk for work today" }] } : {}),
    };
  }
  return {
    today: TODAY,
    days: out,
    names: { sites: {}, groups: {} },
    sites: [
      { id: "yt", urlPattern: "youtube.com", dailyLimitSeconds: 3600, isEnabled: true },
      { id: "ig", urlPattern: "instagram.com", groupId: "social", isEnabled: true },
      { id: "shorts", urlPattern: "youtube.com/shorts", reflectionDelaySeconds: 10, isEnabled: true },
      { id: "x", urlPattern: "x.com", isBlocked: true, isEnabled: true },
    ],
    groups: [{ id: "social", name: "Social media", color: "blue", dailyLimitSeconds: 1800, isEnabled: true, siteIds: ["ig"] }],
    frequentHosts: [{ host: "twitch.tv", opensWindow: 31, activeDays: 6 }],
  };
}

let container: HTMLDivElement;
let root: Root;

function installBrowser(data: StatisticsData) {
  vi.stubGlobal("browser", {
    runtime: {
      sendMessage: vi.fn(async ({ action }: { action: string }) =>
        action === "getStatistics" ? { success: true, data, error: null } : { success: true, data: {}, error: null }
      ),
      getManifest: () => ({ version: "1.14.0" }),
      getURL: (p: string) => p,
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    i18n: { getMessage: () => "", getUILanguage: () => "en" },
    tabs: { create: vi.fn() },
  });
}

async function render() {
  await act(async () => {
    root.render(<StatisticsPage />);
  });
  // Let the getStatistics promise settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function openTab(value: string) {
  const trigger = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes(`stats_tab_${value}`));
  expect(trigger, `tab ${value}`).toBeTruthy();
  await act(async () => {
    trigger!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ version: "1.14.0" }) })));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StatisticsPage", () => {
  it("renders every tab from two months of history", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    installBrowser(sampleData(60));
    await render();

    const text = () => container.textContent || "";
    expect(text()).toContain("stats_privacy_title");
    expect(text()).toContain("stats_daily_title");
    expect(text()).toContain("stats_insights_title");
    expect(container.querySelector("svg path")).toBeTruthy();

    await openTab("sites");
    expect(text()).toContain("Social media");
    expect(text()).toContain("twitch.tv");

    await openTab("limits");
    expect(text()).toContain("stats_attempts_title");
    expect(text()).toContain("stats_fit_title");
    expect(text()).toContain("A long conference talk for work today");

    await openTab("patterns");
    expect(text()).toContain("stats_heatmap_title");
    expect(text()).toContain("stats_weekly_title");

    expect(errors).not.toHaveBeenCalled();
  });

  it("asks the user to come back when there are not enough days yet", async () => {
    installBrowser(sampleData(1));
    await render();
    expect(container.textContent).toContain("stats_notEnough_title");
    expect(container.textContent).toContain("stats_privacy_title");
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });
});

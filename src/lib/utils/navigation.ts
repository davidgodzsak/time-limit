/** Opening the extension's own pages in a tab, from any page or the popup. */

export function openExtensionPage(path: string): void {
  browser.tabs.create({ url: browser.runtime.getURL(path) });
}

export const STATS_PAGE_PATH = "pages/stats/index.html";

export function openStatsPage(): void {
  openExtensionPage(STATS_PAGE_PATH);
}

export function openInfoPage(): void {
  openExtensionPage("pages/info/index.html");
}

export function openSettingsPage(): void {
  browser.runtime.openOptionsPage().catch(() => openExtensionPage("pages/settings/index.html"));
}

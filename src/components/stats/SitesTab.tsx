import { FolderOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import type { StatisticsData } from "@/lib/api";
import { limitFit, ruleDay, summarizeRules, type RangeSlice, type RuleInfo, type RuleSummary } from "@/lib/stats/aggregate";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/stats/format";
import { Delta } from "./Delta";
import { RuleBadge } from "./RuleBadge";
import { Sparkline } from "./Sparkline";
import { ACCENT, STATS_CARD } from "./styles";

interface SitesTabProps {
  slice: RangeSlice;
  rules: Record<string, RuleInfo>;
  frequentHosts: StatisticsData["frequentHosts"];
  onAddPause: (host: string) => void;
  onDismissHost: (host: string) => void;
  isSaving: boolean;
}

/** One sentence on how a rule went in the range. */
function outcome(row: RuleSummary, slice: RangeSlice): { text: string; warn: boolean } {
  const days = slice.cur.filter((d) => d.tracked).length;
  if (row.rule.blocked) return { text: t("stats_sites_tried", String(row.attempts)), warn: false };
  const fit = limitFit(row.rule, slice.cur);
  if (fit) {
    if (fit.tone === "loose") return { text: t("stats_sites_underHalf"), warn: false };
    return { text: t("stats_sites_reached", [String(fit.hits), String(days)]), warn: fit.tone === "tight" };
  }
  const answered = row.passed + row.turnedDown;
  if (answered > 0) return { text: t("stats_sites_turnedBack", formatPercent(row.turnedDown / answered)), warn: false };
  if (row.attempts > 0) return { text: t("stats_sites_tried", String(row.attempts)), warn: false };
  return { text: "", warn: false };
}

export function SitesTab({ slice, rules, frequentHosts, onAddPause, onDismissHost, isSaving }: SitesTabProps) {
  const rows = summarizeRules(rules, slice.cur, slice.prev);
  const maxTime = Math.max(1, ...rows.map((r) => r.time));
  const maxOpens = Math.max(1, ...frequentHosts.map((h) => h.opensWindow));

  return (
    <div className="space-y-6">
      <Card className={`${STATS_CARD} p-2 sm:p-4 stats-fade-up`}>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("stats_sites_empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium px-3 py-2">{t("stats_sites_col_rule")}</th>
                  <th className="font-medium px-3 py-2 w-[34%]">{t("stats_sites_col_time")}</th>
                  <th className="font-medium px-3 py-2 text-right">{t("stats_sites_col_opens")}</th>
                  <th className="font-medium px-3 py-2">{t("stats_sites_col_trend")}</th>
                  <th className="font-medium px-3 py-2">{t("stats_sites_col_outcome")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, k) => {
                  const result = outcome(row, slice);
                  const spark = slice.cur.map((d) => (row.rule.blocked ? ruleDay(d, row.rule.id).b : ruleDay(d, row.rule.id).t));
                  return (
                    <tr key={row.rule.id} className="border-t border-border/70 hover:bg-emerald-50/40 transition-colors">
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{row.rule.name}</span>
                          {row.rule.kind === "group" && <FolderOpen size={14} className="text-muted-foreground" aria-label={t("stats_sites_group")} />}
                        </div>
                        {row.rule.members.length > 0 && <div className="text-xs text-muted-foreground mt-0.5">{row.rule.members.join(" · ")}</div>}
                        <div className="mt-1.5">
                          <RuleBadge rule={row.rule} />
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        {row.time > 0 ? (
                          <>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full rounded-full stats-grow-x" style={{ width: `${(row.time / maxTime) * 100}%`, background: ACCENT, animationDelay: `${k * 70}ms` }} />
                              </div>
                              <span className="tabular-nums font-medium w-20 text-right">{formatMinutes(row.time)}</span>
                            </div>
                            <div className="mt-1">
                              <Delta current={row.time} previous={slice.hasPrev ? row.prevTime : null} />
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">{row.rule.blocked ? t("stats_sites_neverOpens") : "–"}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-right tabular-nums">{row.opens ? formatNumber(row.opens) : "–"}</td>
                      <td className="px-3 py-3 align-top">
                        <Sparkline values={spark} />
                      </td>
                      <td className={`px-3 py-3 align-top text-sm ${result.warn ? "text-amber-700" : "text-foreground/70"}`}>{result.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {frequentHosts.length > 0 && (
        <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`} style={{ animationDelay: "120ms" }}>
          <h2 className="text-lg font-semibold">{t("stats_frequent_title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("stats_frequent_description")}</p>
          <div className="space-y-3">
            {frequentHosts.map((h, k) => (
              <div key={h.host} className="flex flex-wrap items-center gap-3">
                <span className="font-medium w-36 truncate">{h.host}</span>
                <div className="flex-1 min-w-[120px] h-2.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary stats-grow-x" style={{ width: `${(h.opensWindow / maxOpens) * 100}%`, animationDelay: `${k * 80}ms` }} />
                </div>
                <span className="tabular-nums text-sm text-foreground/80 w-40">{t("stats_frequent_count", [String(h.opensWindow), String(h.activeDays)])}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="rounded-full gap-1.5 border-foreground/15 bg-white/60" disabled={isSaving} onClick={() => onAddPause(h.host)}>
                    <Plus size={14} />
                    {t("stats_frequent_addPause")}
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-full h-9 w-9" title={t("stats_frequent_dismiss")} aria-label={t("stats_frequent_dismiss")} disabled={isSaving} onClick={() => onDismissHost(h.host)}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

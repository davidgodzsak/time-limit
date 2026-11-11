import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import CircularProgress from "@/components/CircularProgress";
import { t } from "@/lib/utils/i18n";
import { limitFit, summarizeRules, type FitTone, type RangeSlice, type RuleInfo } from "@/lib/stats/aggregate";
import { formatDay, formatMinutes, formatNumber, formatPercent } from "@/lib/stats/format";
import { FitStrip } from "./FitStrip";
import { RuleBadge } from "./RuleBadge";
import { ACCENT, STATS_CARD } from "./styles";

interface LimitsTabProps {
  slice: RangeSlice;
  rules: Record<string, RuleInfo>;
  /** Called with the suggested new time limit in minutes. */
  onTightenLimit: (rule: RuleInfo, minutes: number) => void;
  isSaving: boolean;
}

const FIT_CHIP: Record<FitTone, string> = {
  tight: "bg-amber-100 text-amber-800",
  loose: "bg-blue-100 text-blue-700",
  fits: "bg-emerald-100 text-emerald-800",
};

export function LimitsTab({ slice, rules, onTightenLimit, isSaving }: LimitsTabProps) {
  const rows = summarizeRules(rules, slice.cur, slice.prev);
  const attempted = rows.filter((r) => r.attempts > 0).sort((a, b) => b.attempts - a.attempts);
  const maxAttempts = Math.max(1, ...attempted.map((r) => r.attempts));
  const paused = rows.filter((r) => r.passed + r.turnedDown > 0);
  const fits = Object.values(rules)
    .filter((rule) => rule.exists && rule.timeLimit && !rule.blocked)
    .map((rule) => ({ rule, fit: limitFit(rule, slice.cur) }))
    .filter((x): x is { rule: RuleInfo; fit: NonNullable<ReturnType<typeof limitFit>> } => x.fit !== null);
  const extensions = slice.cur
    .filter((d) => d.tracked)
    .flatMap((d) => d.ext.map((e) => ({ ...e, date: d.date })))
    .reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`}>
          <h2 className="text-lg font-semibold">{t("stats_attempts_title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("stats_attempts_description")}</p>
          {attempted.length === 0 ? (
            <p className="text-sm text-foreground/70">{t("stats_attempts_none")}</p>
          ) : (
            <div className="space-y-3">
              {attempted.map((row, k) => (
                <div key={row.rule.id}>
                  <div className="flex justify-between text-sm mb-1 gap-2">
                    <span className="font-medium truncate">{row.rule.name}</span>
                    <span className="tabular-nums text-foreground/80">{formatNumber(row.attempts)}×</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full stats-grow-x" style={{ width: `${(row.attempts / maxAttempts) * 100}%`, background: ACCENT, animationDelay: `${k * 80}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`} style={{ animationDelay: "60ms" }}>
          <h2 className="text-lg font-semibold">{t("stats_pause_title")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("stats_pause_description")}</p>
          {paused.length === 0 ? (
            <p className="text-sm text-foreground/70">{t("stats_pause_none")}</p>
          ) : (
            <div className="space-y-4">
              {paused.map((row) => {
                const total = row.passed + row.turnedDown;
                return (
                  <div key={row.rule.id} className="flex items-center gap-4">
                    <CircularProgress value={row.turnedDown} max={total} size={84} strokeWidth={9} color={ACCENT}>
                      <span className="text-lg font-semibold tabular-nums">{formatPercent(row.turnedDown / total)}</span>
                    </CircularProgress>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{row.rule.name}</div>
                      <div className="text-sm text-foreground/70">{t("stats_pause_saidNo", [String(row.turnedDown), String(total)])}</div>
                      <div className="mt-1">
                        <RuleBadge rule={row.rule} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {fits.length > 0 && (
        <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`} style={{ animationDelay: "120ms" }}>
          <h2 className="text-lg font-semibold">{t("stats_fit_title")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("stats_fit_description")}</p>
          <div className="space-y-6">
            {fits.map(({ rule, fit }) => (
              <div key={rule.id}>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium">{rule.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${FIT_CHIP[fit.tone]}`}>{t(`stats_fit_${fit.tone}`)}</span>
                  {fit.suggest && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-full"
                      disabled={isSaving}
                      onClick={() => onTightenLimit(rule, fit.suggest!)}
                    >
                      {t("stats_fit_setTo", formatMinutes(fit.suggest))}
                    </Button>
                  )}
                </div>
                <FitStrip fit={fit} limit={rule.timeLimit!} />
                <p className="text-sm text-foreground/70">
                  {fit.tone === "tight"
                    ? t("stats_fit_tight_text", [String(fit.hits), String(fit.values.length)])
                    : fit.tone === "loose"
                      ? t("stats_fit_loose_text", [formatMinutes(fit.max), formatMinutes(rule.timeLimit!), formatMinutes(fit.suggest!)])
                      : t("stats_fit_fits_text", [String(fit.hits), String(fit.values.length)])}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className={`${STATS_CARD} p-5 sm:p-6 stats-fade-up`} style={{ animationDelay: "180ms" }}>
        <h2 className="text-lg font-semibold">{t("stats_extensions_title")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {extensions.length
            ? t("stats_extensions_summary", [String(extensions.length), formatMinutes(extensions.reduce((s, e) => s + e.m, 0))])
            : t("stats_extensions_none")}
        </p>
        {extensions.length > 0 && (
          <ul className="divide-y divide-border/70">
            {extensions.slice(0, 8).map((e) => (
              <li key={`${e.date}-${e.id}`} className="py-3 flex flex-wrap gap-x-4 gap-y-1 items-baseline">
                <span className="text-sm text-muted-foreground tabular-nums w-16">{formatDay(e.date)}</span>
                <span className="text-sm font-medium w-48 truncate">
                  {rules[e.id]?.name ?? t("stats_rule_removed")}{" "}
                  {e.m > 0 && <span className="text-emerald-700">+{formatMinutes(e.m)}</span>}
                  {e.o > 0 && <span className="text-emerald-700"> +{t("stats_rule_opens", String(e.o))}</span>}
                </span>
                {e.r && <span className="text-sm text-foreground/75 italic flex-1 min-w-[200px]">“{e.r}”</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

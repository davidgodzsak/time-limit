import { Ban, Hourglass, Timer } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import type { RuleInfo } from "@/lib/stats/aggregate";

/** The rule a site or group has today, in one chip. */
export function RuleBadge({ rule }: { rule: RuleInfo }) {
  let Icon = Hourglass;
  let text: string;
  let tone = "bg-emerald-50 text-emerald-800";
  if (!rule.exists) {
    return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">{t("stats_rule_removed")}</span>;
  }
  if (rule.blocked) {
    Icon = Ban;
    text = t("badge_blocked");
    tone = "bg-rose-50 text-rose-700";
  } else if (rule.timeLimit || rule.openLimit) {
    text = [
      rule.timeLimit && t("stats_rule_minutes", String(rule.timeLimit)),
      rule.openLimit && t("stats_rule_opens", String(rule.openLimit)),
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (rule.pause) {
    Icon = Timer;
    text = t("stats_rule_pause", String(rule.pause));
    tone = "bg-amber-50 text-amber-800";
  } else {
    return null;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>
      <Icon size={12} aria-hidden="true" />
      {text}
    </span>
  );
}

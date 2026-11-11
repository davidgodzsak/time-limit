import { TrendingDown, TrendingUp } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { formatPercent } from "@/lib/stats/format";

interface DeltaProps {
  current: number;
  previous: number | null;
}

/** "18% less" in green or "12% more" in amber, against the previous period. Less is better here. */
export function Delta({ current, previous }: DeltaProps) {
  if (previous === null) {
    return <span className="text-xs text-muted-foreground">{t("stats_delta_noEarlier")}</span>;
  }
  if (previous === 0) {
    return current === 0 ? <span className="text-xs text-muted-foreground">{t("stats_delta_same")}</span> : <span className="text-xs text-amber-700">{t("stats_delta_new")}</span>;
  }
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.03) {
    return <span className="text-xs text-muted-foreground">{t("stats_delta_same")}</span>;
  }
  const down = change < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${down ? "text-emerald-700" : "text-amber-700"}`}>
      <Icon size={14} aria-hidden="true" />
      {t(down ? "stats_delta_less" : "stats_delta_more", formatPercent(change))}
    </span>
  );
}

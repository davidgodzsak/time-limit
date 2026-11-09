import { CalendarClock, Lock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import { formatDay } from "@/lib/stats/format";
import { SHADES, STATS_CARD } from "./styles";

interface NotEnoughDataViewProps {
  firstDate: string | null;
  hasRules: boolean;
  onOpenSettings: () => void;
}

/** A faint stacked-area sketch of what the page will look like, purely decorative. */
function Preview() {
  const bands = [
    "M0,90 C60,70 120,80 180,60 S300,50 360,40 L360,120 L0,120Z",
    "M0,100 C60,88 120,95 180,82 S300,75 360,70 L360,120 L0,120Z",
    "M0,110 C60,104 120,108 180,100 S300,96 360,92 L360,120 L0,120Z",
  ];
  return (
    <svg viewBox="0 0 360 120" className="w-full max-w-sm h-auto opacity-60" aria-hidden="true">
      {bands.map((d, k) => (
        <path key={k} d={d} fill={SHADES[k + 2]} stroke="#fff" strokeWidth={1.5} className="stats-grow" style={{ animationDelay: `${k * 120}ms` }} />
      ))}
    </svg>
  );
}

/** Shown until there are enough days to say anything true. */
export function NotEnoughDataView({ firstDate, hasRules, onOpenSettings }: NotEnoughDataViewProps) {
  return (
    <Card className={`${STATS_CARD} p-8 sm:p-10 flex flex-col items-center text-center gap-5 stats-fade-up`}>
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
        <CalendarClock size={28} aria-hidden="true" />
      </div>
      <div className="space-y-2 max-w-[52ch]">
        <h2 className="text-2xl font-semibold text-foreground">{t("stats_notEnough_title")}</h2>
        <p className="text-foreground/75">
          {firstDate
            ? t("stats_notEnough_text", formatDay(firstDate))
            : hasRules
              ? t("stats_notEnough_noData")
              : t("stats_notEnough_noRules")}
        </p>
      </div>
      <Preview />
      <p className="inline-flex items-center gap-2 text-sm text-foreground/70">
        <Lock size={14} aria-hidden="true" />
        {t("stats_notEnough_privacy")}
      </p>
      {!hasRules && (
        <Button onClick={onOpenSettings} className="rounded-full bg-primary hover:bg-primary/90 gap-2 px-6">
          <Settings size={16} />
          {t("info_setup_button")}
        </Button>
      )}
    </Card>
  );
}

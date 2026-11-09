import { BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import { STATS_CARD } from "./styles";

/** Shown if someone reaches the page while statistics are switched off. */
export function StatsOffView({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Card className={`${STATS_CARD} p-8 sm:p-10 flex flex-col items-center text-center gap-5 stats-fade-up`}>
      <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
        <BarChart3 size={28} aria-hidden="true" />
      </div>
      <div className="space-y-2 max-w-[52ch]">
        <h2 className="text-2xl font-semibold text-foreground">{t("stats_off_title")}</h2>
        <p className="text-foreground/75">{t("stats_off_text")}</p>
      </div>
      <Button onClick={onOpenSettings} variant="outline" className="rounded-full gap-2 px-6">
        <Settings size={16} />
        {t("stats_off_button")}
      </Button>
    </Card>
  );
}

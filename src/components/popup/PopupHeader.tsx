import { BarChart3, Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/utils/i18n";
import { openStatsPage } from "@/lib/utils/navigation";
import Logo from "../Logo";

interface PopupHeaderProps {
  onSettings: () => void;
  onInfo?: () => void;
  /** Hidden on the statistics page itself. */
  showStats?: boolean;
}

/** The mint band at the top of every popup view: logo, then info, statistics and settings. */
export function PopupHeader({ onSettings, onInfo, showStats = true }: PopupHeaderProps) {
  return (
    <div className="gradient-mint p-4">
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex gap-1">
          {onInfo && (
            <Button variant="ghost" size="icon" onClick={onInfo} className="hover:bg-white/50" title={t("normalPageView_button_tooltip")} aria-label={t("normalPageView_button_tooltip")}>
              <Info size={18} />
            </Button>
          )}
          {showStats && (
            <Button variant="ghost" size="icon" onClick={openStatsPage} className="hover:bg-white/50" title={t("stats_open")} aria-label={t("stats_open")}>
              <BarChart3 size={18} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onSettings} className="hover:bg-white/50" title={t("stats_openSettings")} aria-label={t("stats_openSettings")}>
            <Settings size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

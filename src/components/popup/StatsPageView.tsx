import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Lock } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { PopupHeader } from "./PopupHeader";

interface StatsPageViewProps {
  onOpenSettings: () => void;
  onOpenInfo: () => void;
}

/** What the popup says while the statistics page is the tab in front. */
export function StatsPageView({ onOpenSettings, onOpenInfo }: StatsPageViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <PopupHeader onSettings={onOpenSettings} onInfo={onOpenInfo} showStats={false} />
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{t("statsPageView_title")}</p>
            <p className="text-sm text-muted-foreground">{t("statsPageView_subtitle")}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground flex gap-2">
          <Lock size={16} className="shrink-0 mt-0.5" />
          {t("stats_notEnough_privacy")}
        </p>
      </CardContent>
    </Card>
  );
}

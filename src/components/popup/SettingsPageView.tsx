
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { PopupHeader } from "./PopupHeader";
import { t } from "@/lib/utils/i18n";

interface SettingsPageViewProps {
  onOpenSettings: () => void;
  onOpenInfo?: () => void;
}

export function SettingsPageView({ onOpenSettings, onOpenInfo }: SettingsPageViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <PopupHeader onSettings={onOpenSettings} onInfo={onOpenInfo} />

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Settings size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{t("settingsPageView_title")}</p>
            <p className="text-sm text-muted-foreground">{t("settingsPageView_subtitle")}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("settingsPageView_description")}
        </p>
      </CardContent>
    </Card>
  );
}

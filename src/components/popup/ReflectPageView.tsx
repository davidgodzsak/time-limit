
import { Card, CardContent } from "@/components/ui/card";
import { Hourglass } from "lucide-react";
import { PopupHeader } from "./PopupHeader";
import { t } from "@/lib/utils/i18n";

interface ReflectPageViewProps {
  onOpenSettings: () => void;
  onOpenInfo?: () => void;
}

/**
 * What the popup shows while the reflection countdown is on screen: nothing to
 * decide here, the decision belongs on the page itself.
 */
export function ReflectPageView({ onOpenSettings, onOpenInfo }: ReflectPageViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <PopupHeader onSettings={onOpenSettings} onInfo={onOpenInfo} />

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Hourglass size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="font-medium">{t("reflectPageView_title")}</p>
            <p className="text-sm text-muted-foreground">
              {t("reflectPageView_subtitle")}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("reflectPageView_description")}
        </p>
      </CardContent>
    </Card>
  );
}

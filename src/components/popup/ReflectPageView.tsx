import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Info, Hourglass } from "lucide-react";
import Logo from "../Logo";
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
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex gap-1">
            {onOpenInfo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenInfo}
                className="hover:bg-white/50"
                title={t("normalPageView_button_tooltip")}
              >
                <Info size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="hover:bg-white/50"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </div>

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

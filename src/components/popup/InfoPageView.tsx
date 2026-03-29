import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Info, Star } from "lucide-react";
import Logo from "../Logo";
import { t } from "@/lib/utils/i18n";
import { getRatingUrl } from "@/lib/constants/rating";

interface InfoPageViewProps {
  onOpenSettings: () => void;
}

export function InfoPageView({ onOpenSettings }: InfoPageViewProps) {
  const handleRateUs = () => {
    const ratingUrl = getRatingUrl();
    browser.tabs.create({ url: ratingUrl });
  };
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
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

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Info size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{t("infoPageView_title")}</p>
            <p className="text-sm text-muted-foreground">{t("infoPageView_subtitle")}</p>
          </div>
        </div>

        <p className="text-sm text-foreground/70 mb-5">
          {t("infoPageView_description")}
        </p>

        <div className="space-y-2">
          <Button
            onClick={onOpenSettings}
            className="w-full rounded-full bg-primary hover:bg-primary/90 gap-2"
          >
            <Settings size={16} />
            {t("infoPageView_button")}
          </Button>
          <Button
            onClick={handleRateUs}
            variant="outline"
            className="w-full rounded-full gap-2 border-emerald-200 hover:bg-emerald-50"
          >
            <Star size={16} />
            {t("infoPageView_rateButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { BarChart3, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import Logo from "../Logo";

interface StatsReadyViewProps {
  onOpen: () => void;
  onLater: () => void;
}

/** Shown once, a few days after statistics start counting, to say there is something to see. */
export function StatsReadyView({ onOpen, onLater }: StatsReadyViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
        </div>
      </div>

      <CardContent className="p-5">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">{t("statsPrompt_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("statsPrompt_body")}</p>
          <p className="mt-3 text-xs text-muted-foreground inline-flex items-start gap-1.5 text-left">
            <Lock size={12} className="shrink-0 mt-0.5" />
            {t("stats_notEnough_privacy")}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={onOpen} className="w-full rounded-lg gap-2" size="sm">
            <BarChart3 size={16} />
            {t("statsPrompt_open")}
          </Button>
          <button onClick={onLater} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            {t("statsPrompt_later")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

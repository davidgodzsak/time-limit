import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Sparkles } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { WHATS_NEW_HIGHLIGHTS } from "@/lib/constants/whatsNew";
import Logo from "../Logo";
import { RatingCard } from "../RatingCard";

interface WhatsNewViewProps {
  /** The version just installed, shown as a badge. */
  version: string | null;
  /** The rating card only appears for users who have not rated yet. */
  showRating: boolean;
  onRate: () => void;
  onAlreadyRated: () => void;
  onDonate: () => void;
  onClose: () => void;
}

/**
 * The release note, shown once after an update and then dismissed for good.
 * Everything below the highlights is optional and easy to ignore — the close
 * button is always the shortest path back to the page the user was on.
 */
export function WhatsNewView({
  version,
  showRating,
  onRate,
  onAlreadyRated,
  onDonate,
  onClose,
}: WhatsNewViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          {version && (
            <Badge variant="secondary" className="rounded-full bg-white/50">
              v{version}
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-5 max-h-[520px] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            {t("whatsNew_title")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {t("whatsNew_subtitle")}
        </p>

        <div className="space-y-3 mb-5">
          {WHATS_NEW_HIGHLIGHTS.map((highlight) => {
            const Icon = highlight.icon;
            return (
              <div
                key={highlight.titleKey}
                className="flex gap-3 rounded-2xl bg-muted/50 p-3"
              >
                <div className="w-9 h-9 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t(highlight.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(highlight.bodyKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <Button className="w-full rounded-xl mb-4" size="sm" onClick={onClose}>
          {t("whatsNew_button_continue")}
        </Button>

        {showRating && (
          <div className="mb-4">
            <RatingCard onRate={onRate} onAlreadyRated={onAlreadyRated} />
          </div>
        )}

        <div className="rounded-2xl border border-dashed p-4 text-center">
          <p className="text-sm text-foreground mb-1">
            {t("whatsNew_support_title")}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {t("whatsNew_support_description")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl w-full"
            onClick={onDonate}
          >
            <Heart size={14} className="mr-1.5 text-rose-500" />
            {t("whatsNew_support_button")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

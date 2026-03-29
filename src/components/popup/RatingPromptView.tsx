import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import Logo from "../Logo";

interface RatingPromptViewProps {
  onRate: () => void;
  onAlreadyRated: () => void;
  onDismiss: () => void;
}

export function RatingPromptView({
  onRate,
  onAlreadyRated,
  onDismiss,
}: RatingPromptViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
        </div>
      </div>

      <CardContent className="p-5">
        <div className="text-center mb-6">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={24}
                className="fill-emerald-500 text-emerald-500"
              />
            ))}
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t("ratingPrompt_title")}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("ratingPrompt_description")}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onRate}
            className="w-full rounded-lg"
            size="sm"
          >
            {t("ratingPrompt_rateButton")}
          </Button>
          <Button
            onClick={onAlreadyRated}
            variant="outline"
            className="w-full rounded-lg"
            size="sm"
          >
            {t("ratingPrompt_alreadyRatedButton")}
          </Button>
          <button
            onClick={onDismiss}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            {t("ratingPrompt_laterButton")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

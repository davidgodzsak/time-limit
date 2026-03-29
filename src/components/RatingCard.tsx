import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/utils/i18n";

interface RatingCardProps {
  onRate: () => void;
  onAlreadyRated: () => void;
  onDismiss?: () => void;
}

export function RatingCard({
  onRate,
  onAlreadyRated,
  onDismiss,
}: RatingCardProps) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
      <div className="flex justify-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={20}
            className="fill-emerald-500 text-emerald-500"
          />
        ))}
      </div>
      <h3 className="font-semibold text-foreground text-center mb-2">
        {t("ratingBanner_title")}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-5">
        {t("ratingBanner_description")}
      </p>
      <div className="flex gap-2 justify-center mb-3">
        <Button
          variant="default"
          size="sm"
          onClick={onRate}
          className="rounded-lg px-4"
        >
          {t("ratingBanner_rateButton")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAlreadyRated}
          className="rounded-lg px-4"
        >
          {t("ratingBanner_alreadyRatedButton")}
        </Button>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 text-center"
        >
          {t("ratingBanner_laterButton")}
        </button>
      )}
    </div>
  );
}

import { Lightbulb, FolderOpen, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/lib/utils/i18n";

interface WelcomeScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onStart, onSkip }: WelcomeScreenProps) {
  return (
    <Dialog open={true}>
      <DialogContent hideCloseButton className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">{t("onboarding_welcome_title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("onboarding_welcome_subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Features list */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lightbulb
                className="text-emerald-600 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="font-semibold text-sm">{t("onboarding_welcome_feature1_title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding_welcome_feature1_description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FolderOpen className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-sm">{t("onboarding_welcome_feature2_title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding_welcome_feature2_description")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Quote
                className="text-emerald-600 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="font-semibold text-sm">{t("onboarding_welcome_feature3_title")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("onboarding_welcome_feature3_description")}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {t("onboarding_welcome_duration")}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 rounded-lg"
          >
            {t("onboarding_welcome_button_skip")}
          </Button>
          <Button
            onClick={onStart}
            autoFocus
            className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            {t("onboarding_welcome_button_start")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

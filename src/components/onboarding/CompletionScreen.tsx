import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import browserImg from "@/browser.png";
import { t } from "@/lib/utils/i18n";

interface CompletionScreenProps {
  onClose: () => void;
}

export function CompletionScreen({ onClose }: CompletionScreenProps) {
  return (
    <Dialog open={true}>
      <DialogContent hideCloseButton className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">{t("onboarding_completion_title")}</DialogTitle>
          <DialogDescription className="text-base">
            {t("onboarding_completion_subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Completion message */}
          <div className="flex items-start gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("onboarding_completion_message")}
              </p>
            </div>
          </div>

          {/* Toolbar icon explanation */}
          <div className="space-y-3">
            <p className="font-semibold text-sm">{t("onboarding_completion_toolbar_title")}</p>
            <div className="relative bg-muted p-4 rounded-xl overflow-hidden">
              {/* Browser image with fade transparency */}
              <img
                src={browserImg}
                alt={t("onboarding_completion_toolbar_image_alt")}
                className="w-full h-auto"
                style={{
                  opacity: 0.6,
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)",
                }}
              />
              <p className="text-xs text-muted-foreground mt-3">
                {t("onboarding_completion_toolbar_description")}
              </p>
            </div>
          </div>
        </div>

        {/* Close button */}
        <Button
          onClick={onClose}
          className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
        >
          {t("onboarding_completion_button_start")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

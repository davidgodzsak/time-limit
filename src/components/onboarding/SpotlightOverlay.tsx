import { useEffect, useState } from "react";
import {
  ChevronRight,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";

interface SpotlightOverlayProps {
  targetSelector: string;
  title: string;
  message: string;
  /** Leave the tour (it still ends on the completion screen). */
  onSkipOnboarding: () => void;
  /** Move to the next step, whether or not this one was done. */
  onContinue?: () => void;
  /**
   * The step asks the user to do something (click a tab, add a site). Its
   * button then reads "Skip step" in gray, so it does not pull the eye away
   * from the thing the bubble asks for. Steps that only explain keep "Next".
   */
  isActionStep?: boolean;
  onFinish?: () => void;
  isLastStep?: boolean;
  successMessage?: string;
  showSuccess?: boolean;
}

export function SpotlightOverlay({
  targetSelector,
  title,
  message,
  onSkipOnboarding,
  onContinue,
  isActionStep,
  onFinish,
  isLastStep,
  successMessage,
  showSuccess,
}: SpotlightOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [bubblePosition, setBubblePosition] = useState<{
    top: number;
    left: number;
    direction: "right" | "bottom" | "center";
  }>({ top: 0, left: 0, direction: "right" });
  // The target may not be on screen yet (a tab still rendering) or at all
  // (e.g. the user deleted every group). Rather than render nothing — which
  // looks like the tour ended — fall back to a centered bubble.
  const [targetMissing, setTargetMissing] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(targetSelector) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        setTargetElement(element);

        // Add glow to element
        element.style.boxShadow =
          "0 0 0 3px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.8)";
        element.classList.add("animate-pulse");

        // Position bubble to the right of the element, or below if on the right side
        const rightSpace = window.innerWidth - rect.right;
        const bubbleWidth = 360;

        if (rightSpace > bubbleWidth + 20) {
          // Enough space on the right
          setBubblePosition({
            top: rect.top + rect.height / 2,
            left: rect.right + 20,
            direction: "right",
          });
        } else {
          // Position below
          setBubblePosition({
            top: rect.bottom + 20,
            left: Math.max(10, rect.left + rect.width / 2 - bubbleWidth / 2),
            direction: "bottom",
          });
        }
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    let attempts = 0;
    const retry = window.setInterval(() => {
      if (document.querySelector(targetSelector)) {
        window.clearInterval(retry);
        setTargetMissing(false);
        updatePosition();
      } else if (++attempts >= 10) {
        window.clearInterval(retry);
        setTargetMissing(true);
      }
    }, 100);

    return () => {
      window.clearInterval(retry);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);

      // Clean up glow when unmounting
      if (targetElement) {
        targetElement.style.boxShadow = "";
        targetElement.classList.remove("animate-pulse");
      }
    };
  }, [targetSelector, targetElement]);

  if (!targetRect && !targetMissing) return null;
  const position = targetRect
    ? bubblePosition
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, direction: "center" as const };

  return (
    <>
      {/* Message Bubble using shadcn Card */}
      <div
        className="fixed z-50 pointer-events-auto w-96"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform:
            position.direction === "center"
              ? "translate(-50%, -50%)"
              : position.direction === "right"
                ? "translateY(-50%)"
                : "translateY(0)",
        }}
      >
        <Card className="border border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg rounded-3xl">
          {showSuccess && successMessage ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600 flex-shrink-0" size={24} />
                <div>
                  <p className="font-bold text-emerald-900">{successMessage}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <Lightbulb className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                <h3 className="font-bold text-foreground text-lg leading-tight">
                  {title}
                </h3>
              </div>

              {/* Message */}
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {message}
              </p>

              {/* Buttons */}
              <div className="flex gap-2 justify-between items-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkipOnboarding}
                  className="rounded-lg text-muted-foreground"
                >
                  {t("spotlight_button_skip_onboarding")}
                </Button>
                {isActionStep && !isLastStep ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onContinue}
                    className="rounded-lg text-muted-foreground"
                  >
                    {t("spotlight_button_skip_step")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={isLastStep ? onFinish : onContinue}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-1"
                  >
                    {t(isLastStep ? "spotlight_button_finish" : "spotlight_button_next")}
                    <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Arrow pointer */}
        {position.direction !== "center" && <div
          className={`transform absolute w-3 h-3 ${bubblePosition.direction === "right" ? "border-b border-l" : "border-l border-t"} rotate-45 border-emerald-500 bg-emerald-50`}
          style={{
            top:
              bubblePosition.direction === "right"
                ? "calc(50% - 6px)"
                : "-5.5px",
            left:
              bubblePosition.direction === "right"
                ? "-5.5px"
                : "calc(50% - 6px)"
          }}
        />}
      </div>
    </>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, AlertCircle, Loader2, Info, Ban } from "lucide-react";
import Logo from "../Logo";
import { t } from "@/lib/utils/i18n";

interface TimeoutPageViewProps {
  originalTimeLimit: number;
  originalOpensLimit: number;
  siteId: string | null;
  blockedUrl: string | null;
  /**
   * The site is blocked outright rather than out of time. There is no
   * allowance to raise, so the extend flow does not apply at all.
   */
  isFullyBlocked?: boolean;
  isSaving: boolean;
  onExtendLimit: (minutes: number, opens: number, excuse: string) => Promise<void>;
  onOpenSettings: () => void;
  onOpenInfo?: () => void;
}

export function TimeoutPageView({
  originalTimeLimit,
  originalOpensLimit,
  siteId,
  blockedUrl,
  isFullyBlocked = false,
  isSaving,
  onExtendLimit,
  onOpenSettings,
  onOpenInfo,
}: TimeoutPageViewProps) {
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState("");
  const [extendOpens, setExtendOpens] = useState("");
  const [excuse, setExcuse] = useState("");
  const [isExtending, setIsExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [isExtended, setIsExtended] = useState(false);

  const extendMinutesNum = parseInt(extendMinutes) || 0;
  const extendOpensNum = parseInt(extendOpens) || 0;
  const newTimeLimit = originalTimeLimit + extendMinutesNum;
  const newOpensLimit = originalOpensLimit + extendOpensNum;

  const handleExtend = async () => {
    if (excuse.length < 35) {
      setExtensionError(t("timeoutPageView_extend_error_minChars"));
      return;
    }
    if (extendMinutesNum <= 0 && extendOpensNum <= 0) {
      setExtensionError(t("timeoutPageView_extend_error_noExtension"));
      return;
    }

    try {
      setIsExtending(true);
      setExtensionError(null);
      await onExtendLimit(extendMinutesNum, extendOpensNum, excuse);
      setShowExtendForm(false);
      setExtendMinutes("");
      setExtendOpens("");
      setExcuse("");
      setIsExtended(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setExtensionError(message);
    } finally {
      setIsExtending(false);
    }
  };

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
                title="About this extension"
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
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            {isFullyBlocked ? (
              <Ban size={20} className="text-red-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {isFullyBlocked
                ? t("timeoutPageView_blocked_title")
                : t("timeoutPageView_title")}
            </p>
            {!isFullyBlocked && (
              <p className="text-sm text-muted-foreground">
                {showExtendForm || isExtended ? t("timeoutPageView_subtitle_extended") : t("timeoutPageView_subtitle_normal")}
              </p>
            )}
          </div>
        </div>

        {/* A block is not an allowance, so there is nothing to extend: offer
            the settings page, which is the only honest way back. */}
        {isFullyBlocked ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {t("timeoutPageView_blocked_message")}
            </p>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={onOpenSettings}
            >
              {t("timeoutPageView_button_openSettings")}
            </Button>
          </>
        ) : (
          <>
          {!showExtendForm && !isExtended && (
            <p className="text-sm text-muted-foreground mb-4">
              {t("timeoutPageView_message")}
            </p>
          )}

          {siteId && (
            <div className="border-t pt-4">
              {!showExtendForm ? (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setShowExtendForm(true)}
                >
                  {t("timeoutPageView_button_extend")}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t("timeoutPageView_extend_title")}</p>

                  {(originalTimeLimit > 0 || originalOpensLimit > 0) && (
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      {originalTimeLimit > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("timeoutPageView_extend_timeLimit")}</span>
                          <span className="font-medium">
                            {originalTimeLimit}{" "}
                            <span className="text-muted-foreground text-[10px]">
                              {t("timeoutPageView_extend_timeLabel")}
                            </span>
                            {extendMinutesNum > 0 && (
                              <>
                                {" "}
                                → {newTimeLimit}{" "}
                                <span className="text-muted-foreground text-[10px]">
                                  {t("timeoutPageView_extend_timeLabel")}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      {originalOpensLimit > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t("timeoutPageView_extend_opensLimit")}
                          </span>
                          <span className="font-medium">
                            {originalOpensLimit}{" "}
                            <span className="text-muted-foreground text-[10px]">
                              {t("timeoutPageView_extend_opensLabel")}
                            </span>
                            {extendOpensNum > 0 && (
                              <>
                                {" "}
                                → {newOpensLimit}{" "}
                                <span className="text-muted-foreground text-[10px]">
                                  {t("timeoutPageView_extend_opensLabel")}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t("timeoutPageView_extend_minutes_label")}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      placeholder="0"
                      value={extendMinutes}
                      onChange={(e) => setExtendMinutes(e.target.value)}
                      disabled={isExtending}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t("timeoutPageView_extend_opens_label")}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="0"
                      value={extendOpens}
                      onChange={(e) => setExtendOpens(e.target.value)}
                      disabled={isExtending}
                      className="rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      {t("timeoutPageView_extend_excuse_label")}
                    </label>
                    <Textarea
                      value={excuse}
                      onChange={(e) => setExcuse(e.target.value)}
                      placeholder={t("timeoutPageView_extend_excuse_placeholder")}
                      disabled={isExtending}
                      className="min-h-[60px] rounded-xl"
                    />
                    <p
                      className={`text-xs mt-1 ${
                        excuse.length >= 35
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t("timeoutPageView_extend_excuse_counter", excuse.length.toString())}
                    </p>
                  </div>

                  {extensionError && (
                    <p className="text-xs text-red-600">{extensionError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowExtendForm(false);
                        setExtensionError(null);
                      }}
                      disabled={isExtending}
                      className="flex-1 rounded-xl"
                    >
                      {t("timeoutPageView_extend_button_cancel")}
                    </Button>
                    <Button
                      onClick={handleExtend}
                      disabled={
                        isExtending ||
                        excuse.length < 35 ||
                        (extendMinutesNum <= 0 && extendOpensNum <= 0)
                      }
                      className="flex-1 rounded-xl"
                    >
                      {isExtending ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          {t("timeoutPageView_extend_button_extending")}
                        </>
                      ) : (
                        t("timeoutPageView_extend_button_extend")
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

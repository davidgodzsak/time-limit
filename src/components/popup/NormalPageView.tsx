import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Settings, MousePointerClick, Info, Zap, Hourglass, Ban } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import Logo from "../Logo";
import CircularProgress from "../CircularProgress";

interface NormalPageViewProps {
  siteName: string;
  groupName: string | null;
  timeUsed: number;
  timeLimit: number;
  timeRemaining: number;
  opensUsed: number;
  opensLimit: number;
  opensRemaining: number;
  isExtended?: boolean;
  /** Seconds of pause shown before this site opens, 0 when it opens directly. */
  reflectionDelay?: number;
  /** The site is blocked outright — no allowance, no countdown. */
  isBlocked?: boolean;
  /** Set when the block comes from the group rather than the site itself. */
  blockedByGroup?: boolean;
  onSettings: () => void;
  onInfo?: () => void;
}

export function NormalPageView({
  siteName,
  groupName,
  timeUsed,
  timeLimit,
  timeRemaining,
  opensUsed,
  opensLimit,
  opensRemaining,
  isExtended = false,
  reflectionDelay = 0,
  isBlocked = false,
  blockedByGroup = false,
  onSettings,
  onInfo,
}: NormalPageViewProps) {
  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <div className="gradient-mint p-4">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex gap-1">
            {onInfo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onInfo}
                className="hover:bg-white/50"
                title={t("normalPageView_button_tooltip")}
              >
                <Info size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="hover:bg-white/50"
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <span className="text-lg">📘</span>
          </div>
          <div>
            <p className="font-medium text-foreground">{siteName}</p>
            {groupName && (
              <p className="text-sm text-primary font-medium">{groupName}</p>
            )}
          </div>
        </div>

        {/* A block outranks every other rule, so it replaces the progress the
            other rules would draw rather than sitting above it. */}
        {isBlocked ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
            <Ban size={28} className="mx-auto mb-3 text-destructive" />
            <p className="font-medium text-foreground">
              {t("normalPageView_blocked_title")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("normalPageView_blocked_description")}
            </p>
            {blockedByGroup && groupName && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("normalPageView_blocked_byGroup", groupName)}
              </p>
            )}
          </div>
        ) : (
          <>
          {(isExtended || reflectionDelay > 0) && (
            <div className="flex justify-center gap-2 mb-4">
              {isExtended && (
                <Badge
                  variant="secondary"
                  className="rounded-full gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100"
                >
                  <Zap size={12} />
                  {t("normalPageView_extended_badge")}
                </Badge>
              )}
              {reflectionDelay > 0 && (
                <Badge
                  variant="secondary"
                  className="rounded-full gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                >
                  <Hourglass size={12} />
                  {t("badge_reflectionDelay", String(reflectionDelay))}
                </Badge>
              )}
            </div>
          )}

          {timeLimit > 0 ? (
            <div className="flex justify-center mb-5">
              <CircularProgress
                value={timeUsed}
                max={timeLimit}
                size={140}
                strokeWidth={10}
              >
                <span className="text-3xl font-bold text-foreground">
                  {timeRemaining}
                </span>
                <span className="text-sm text-muted-foreground">{t("normalPageView_minLeft")}</span>
              </CircularProgress>
            </div>
          ) : (
            reflectionDelay > 0 &&
            opensLimit === 0 && (
              // A site can be limited by the pause alone — there is no daily
              // allowance to count down, so show what actually happens instead.
              <div className="bg-muted/50 rounded-2xl p-4 mb-4 text-center">
                <Hourglass size={20} className="mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">
                  {t("normalPageView_reflectionOnly_title", String(reflectionDelay))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("normalPageView_reflectionOnly_description")}
                </p>
              </div>
            )
          )}

          {opensLimit > 0 && (
            <div className="bg-muted/50 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MousePointerClick size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">{t("normalPageView_opensLimit_label")}</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {opensUsed} / {opensLimit}
                </span>
              </div>
              <Progress
                value={(opensUsed / opensLimit) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t("normalPageView_opensRemaining", opensRemaining.toString())}
              </p>
            </div>
          )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

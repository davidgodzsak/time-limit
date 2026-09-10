import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Plus, Globe, Loader2, Info, Hourglass, Lightbulb } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { UIGroup } from "@/lib/storage";
import type { LimitSuggestion } from "@/lib/api";
import Logo from "../Logo";
import { ReflectionDelayPicker } from "../ReflectionDelayPicker";

/** The delay the suggestion banner offers — the lightest thing that helps. */
const SUGGESTED_REFLECTION_SECONDS = 10;

interface UnlimitedSiteViewProps {
  siteName: string;
  /** Pattern a new limit will be stored under, e.g. `youtube.com`. */
  sitePattern: string;
  selectedTimeLimit: number | null;
  selectedOpensLimit: number | null;
  selectedReflectionDelay: number | null;
  /** Set when the extension noticed this site being opened over and over. */
  suggestion?: LimitSuggestion | null;
  showGroupSelector: boolean;
  isLoadingGroups: boolean;
  availableGroups: UIGroup[];
  isSaving: boolean;
  onSelectTimeLimit: (minutes: number) => void;
  onSelectOpensLimit: (opens: number) => void;
  onSelectReflectionDelay: (seconds: number | undefined) => void;
  onAcceptSuggestion?: (seconds: number) => void;
  onDismissSuggestion?: () => void;
  onAddLimit: () => void;
  onOpenSettings: () => void;
  onOpenGroupSelector: () => void;
  onAddToGroup: (groupId: string) => void;
  onCloseGroupSelector: () => void;
  onInfo?: () => void;
}

export function UnlimitedSiteView({
  siteName,
  sitePattern,
  selectedTimeLimit,
  selectedOpensLimit,
  selectedReflectionDelay,
  suggestion,
  showGroupSelector,
  isLoadingGroups,
  availableGroups,
  isSaving,
  onSelectTimeLimit,
  onSelectOpensLimit,
  onSelectReflectionDelay,
  onAcceptSuggestion,
  onDismissSuggestion,
  onAddLimit,
  onOpenSettings,
  onOpenGroupSelector,
  onAddToGroup,
  onCloseGroupSelector,
  onInfo,
}: UnlimitedSiteViewProps) {
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
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Globe size={20} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{siteName}</p>
            <p className="text-sm text-muted-foreground">{t("unlimitedSiteView_notTracked")}</p>
          </div>
        </div>

        {suggestion && onAcceptSuggestion && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2 mb-3">
              <Lightbulb size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900">
                  {t("suggestion_title")}
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  {t("suggestion_body", [
                    suggestion.host,
                    String(suggestion.opensToday),
                  ])}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => onAcceptSuggestion(SUGGESTED_REFLECTION_SECONDS)}
              disabled={isSaving}
            >
              <Hourglass size={14} className="mr-1.5" />
              {t("suggestion_button_accept", String(SUGGESTED_REFLECTION_SECONDS))}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-xl text-xs text-amber-800 hover:bg-amber-100 mt-1"
              onClick={onDismissSuggestion}
              disabled={isSaving}
            >
              {t("suggestion_button_dismiss")}
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-5">
          {t("unlimitedSiteView_description")}
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("unlimitedSiteView_timeLimit_label")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map((minutes) => (
                <Button
                  key={minutes}
                  variant={selectedTimeLimit === minutes ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl ${
                    selectedTimeLimit === minutes
                      ? ""
                      : "border-primary/30 hover:bg-primary/10 hover:border-primary"
                  }`}
                  onClick={() => onSelectTimeLimit(minutes)}
                  disabled={isSaving}
                >
                  {minutes === 60 ? "1h" : `${minutes}m`}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("unlimitedSiteView_opensLimit_label")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 20].map((opens) => (
                <Button
                  key={opens}
                  variant={selectedOpensLimit === opens ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl ${
                    selectedOpensLimit === opens
                      ? ""
                      : "border-primary/30 hover:bg-primary/10 hover:border-primary"
                  }`}
                  onClick={() => onSelectOpensLimit(opens)}
                  disabled={isSaving}
                >
                  {opens}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("unlimitedSiteView_reflectionDelay_label")}
            </p>
            <ReflectionDelayPicker
              value={selectedReflectionDelay ?? undefined}
              onChange={onSelectReflectionDelay}
              disabled={isSaving}
            />
          </div>

          <Button
            className="w-full rounded-xl"
            size="sm"
            onClick={onAddLimit}
            disabled={
              isSaving ||
              (!selectedTimeLimit && !selectedOpensLimit && !selectedReflectionDelay)
            }
          >
            <Plus size={14} className="mr-1.5" />
            {t("unlimitedSiteView_button_addLimit")}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <div className="relative flex justify-center">
              <span className="px-2 bg-card text-xs text-muted-foreground">
                {t("unlimitedSiteView_divider")}
              </span>
            </div>
          </div>

          {showGroupSelector ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("unlimitedSiteView_groupSelector_label")}
              </p>
              {isLoadingGroups ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : availableGroups.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableGroups.map((group) => (
                    <Button
                      key={group.id}
                      variant="outline"
                      className="w-full rounded-xl justify-start"
                      size="sm"
                      onClick={() => onAddToGroup(group.id as string)}
                      disabled={isSaving}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${group.color} mr-2`}
                      />
                      {group.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("unlimitedSiteView_groupSelector_empty")}
                </p>
              )}
              <Button
                variant="ghost"
                className="w-full rounded-xl text-xs"
                size="sm"
                onClick={onCloseGroupSelector}
                disabled={isSaving}
              >
                {t("unlimitedSiteView_button_cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl"
              size="sm"
              onClick={onOpenGroupSelector}
              disabled={isSaving}
            >
              <Plus size={14} className="mr-1.5" />
              {t("unlimitedSiteView_button_addToGroup")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

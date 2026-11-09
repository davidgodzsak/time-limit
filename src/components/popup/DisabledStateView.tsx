import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { PopupHeader } from "./PopupHeader";

interface DisabledStateViewProps {
  siteName: string;
  disabledReason: "site" | "group" | "both" | null;
  groupName: string | null;
  isSaving: boolean;
  onTurnOnSite: () => void;
  onOpenSettings: () => void;
}

export function DisabledStateView({
  siteName,
  disabledReason,
  groupName,
  isSaving,
  onTurnOnSite,
  onOpenSettings,
}: DisabledStateViewProps) {
  const getMessage = () => {
    if (disabledReason === "both") {
      return t("disabledStateView_message_both");
    } else if (disabledReason === "group") {
      return t("disabledStateView_message_group");
    } else {
      return t("disabledStateView_message_site");
    }
  };

  const getLabel = () => {
    if (disabledReason === "group") {
      return `${groupName} (${t("disabledStateView_disabled").toLowerCase()})`;
    } else if (disabledReason === "both") {
      return `${siteName} (${t("disabledStateView_disabled").toLowerCase()})`;
    } else {
      return t("disabledStateView_disabled");
    }
  };

  return (
    <Card className="w-80 shadow-soft border-0 overflow-hidden">
      <PopupHeader onSettings={onOpenSettings} />

      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <Pause size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">{siteName}</p>
            <p className="text-sm text-muted-foreground">{getLabel()}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5">{getMessage()}</p>

        <Button
          className="w-full rounded-xl"
          onClick={onTurnOnSite}
          disabled={isSaving}
        >
          <Play size={16} className="mr-2" />
          {t("disabledStateView_button")}
        </Button>
      </CardContent>
    </Card>
  );
}

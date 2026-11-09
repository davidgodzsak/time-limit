import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import { STATS_CARD } from "./styles";

/** The promise, said plainly and up front: these numbers never leave this browser. */
export function PrivacyNote() {
  return (
    <Card className={`${STATS_CARD} p-5 flex items-start gap-4`}>
      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
        <Lock size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{t("stats_privacy_title")}</p>
        <p className="text-sm text-foreground/75 mt-0.5 max-w-[70ch]">{t("stats_privacy_text")}</p>
      </div>
    </Card>
  );
}

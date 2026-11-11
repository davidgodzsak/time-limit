import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { t } from "@/lib/utils/i18n";
import { HISTORY_RETENTION_LABEL_DAYS } from "./retention";

interface StatsFooterProps {
  onExport: () => void;
  onClear: () => void;
  isSaving: boolean;
}

/** Export and delete: the user's data, the user's call. */
export function StatsFooter({ onExport, onClear, isSaving }: StatsFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/70">
      <p>{t("stats_footer_retention", String(HISTORY_RETENTION_LABEL_DAYS))}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-foreground/15 bg-white/60" onClick={onExport}>
          <Download size={14} />
          {t("stats_footer_export")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-foreground/15 bg-white/60 text-rose-700 hover:text-rose-800" disabled={isSaving}>
              <Trash2 size={14} />
              {t("stats_footer_clear")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("stats_clear_title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("stats_clear_text")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("stats_clear_cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t("stats_clear_confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

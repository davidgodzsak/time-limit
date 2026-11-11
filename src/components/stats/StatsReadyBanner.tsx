import { useEffect, useState } from "react";
import { BarChart3, X } from "lucide-react";
import * as api from "@/lib/api";
import { t } from "@/lib/utils/i18n";
import { openStatsPage } from "@/lib/utils/navigation";

/**
 * The "your statistics are ready" note as a quiet strip at the bottom of the
 * timeout and reflection pages. Shares its one-time state with the popup's
 * StatsReadyView (stats_prompt_storage.js): opening the page or closing the
 * strip retires it everywhere, for good. Renders nothing until it should.
 */
export function StatsReadyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api
      .getStatsPrompt()
      .then(({ shouldShow }) => setVisible(shouldShow))
      .catch(() => {
        /* non-critical */
      });
  }, []);

  if (!visible) return null;

  const retire = (open: boolean) => {
    setVisible(false);
    if (open) openStatsPage();
    api.markStatsPromptSeen().catch(() => {
      /* non-critical */
    });
  };

  return (
    <div className="mt-10 mx-auto w-full max-w-md flex items-center gap-3 rounded-2xl bg-white/70 backdrop-blur shadow-soft px-4 py-3 text-left stats-fade-up">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
        <BarChart3 size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t("statsPrompt_title")}</p>
        <button type="button" onClick={() => retire(true)} className="text-xs font-medium text-emerald-700 hover:underline">
          {t("statsPrompt_open")} →
        </button>
      </div>
      <button
        type="button"
        onClick={() => retire(false)}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/80 transition-colors"
        title={t("statsPrompt_dismiss")}
        aria-label={t("statsPrompt_dismiss")}
      >
        <X size={16} />
      </button>
    </div>
  );
}

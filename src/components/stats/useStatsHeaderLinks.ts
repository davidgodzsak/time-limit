import { BarChart3 } from "lucide-react";
import { t } from "@/lib/utils/i18n";
import { openStatsPage } from "@/lib/utils/navigation";
import { useStatisticsEnabled } from "@/lib/hooks/useStatisticsEnabled";
import type { HeaderLink } from "../PageTemplate";

/** The statistics icon for a page header, or nothing when statistics are switched off. */
export function useStatsHeaderLinks(): HeaderLink[] {
  const enabled = useStatisticsEnabled();
  return enabled ? [{ icon: BarChart3, title: t("stats_open"), onClick: openStatsPage }] : [];
}

import { useEffect, useState } from "react";
import * as api from "@/lib/api";

/**
 * Whether the user collects statistics (Settings → Preferences). Starts as
 * false so nothing statistics-related flashes in for someone who turned it
 * off, then follows the switch live via the `statisticsToggled` broadcast.
 */
export function useStatisticsEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .getDisplayPreferences()
      .then((prefs) => active && setEnabled(prefs.collectStatistics !== false))
      .catch(() => {
        /* stay hidden */
      });
    const stop = api.listenForBroadcasts((event, data) => {
      if (event === "statisticsToggled") setEnabled((data as { enabled?: boolean })?.enabled !== false);
    });
    return () => {
      active = false;
      stop();
    };
  }, []);
  return enabled;
}

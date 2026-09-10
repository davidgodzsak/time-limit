import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/utils/i18n";
import PageTemplate from "./PageTemplate";
import CircularProgress from "./CircularProgress";
import * as api from "@/lib/api";
import { logError } from "@/lib/utils/errorHandler";

/**
 * Only http(s) destinations are ever restored. The original URL travels through
 * a query parameter, so anything else could be an injected `javascript:` link.
 */
function safeDestination(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Falls back to the raw pattern when the URL cannot be parsed. */
function displayName(url: string | null, pattern: string): string {
  if (pattern) return pattern;
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const ReflectionPage = () => {
  const params = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const originalUrl = useMemo(
    () => safeDestination(params.get("url")),
    [params]
  );
  const siteId = params.get("siteId") || "";
  const requestedSeconds = Number(params.get("seconds")) || 10;

  const [remaining, setRemaining] = useState(requestedSeconds);
  const [siteLabel, setSiteLabel] = useState(displayName(originalUrl, ""));
  const [groupName, setGroupName] = useState<string | null>(null);
  const [opensToday, setOpensToday] = useState(0);
  const [dismissedToday, setDismissedToday] = useState(0);
  const [isDeciding, setIsDeciding] = useState(false);

  // Enrich the countdown with what the site cost so far today. Purely
  // informational — the delay itself never depends on this call succeeding.
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;

    api
      .getReflectionInfo(siteId)
      .then((info) => {
        if (cancelled) return;
        setSiteLabel(displayName(originalUrl, info.urlPattern));
        setGroupName(info.groupName);
        setOpensToday(info.opensToday);
        setDismissedToday(info.dismissedToday);
      })
      .catch((error) => logError("Error loading reflection info", error));

    return () => {
      cancelled = true;
    };
  }, [siteId, originalUrl]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const isReady = remaining <= 0;

  const handleProceed = useCallback(async () => {
    if (!originalUrl) return;
    setIsDeciding(true);
    try {
      // Recorded before navigating: the answer also buys a short pass, without
      // which this same navigation would bounce straight back here.
      await api.recordReflectionAnswer(siteId, "proceeded");
    } catch (error) {
      logError("Error recording reflection answer", error);
    }
    window.location.replace(originalUrl);
  }, [originalUrl, siteId]);

  const handleDismiss = useCallback(async () => {
    setIsDeciding(true);
    try {
      await api.recordReflectionAnswer(siteId, "dismissed");
    } catch (error) {
      logError("Error recording reflection answer", error);
    }

    const timeoutUrl = new URL(
      browser.runtime.getURL("pages/timeout/index.html")
    );
    if (originalUrl) timeoutUrl.searchParams.set("blockedUrl", originalUrl);
    if (siteId) timeoutUrl.searchParams.set("siteId", siteId);
    timeoutUrl.searchParams.set("limitType", "reflection");
    window.location.replace(timeoutUrl.toString());
  }, [originalUrl, siteId]);

  const handleOpenInfo = () => {
    window.open(browser.runtime.getURL("pages/info/index.html"), "_blank");
  };

  return (
    <PageTemplate
      version=""
      onHeaderAction={handleOpenInfo}
      layout="centered"
      showVersionBadge={false}
      logoSize="sm"
    >
      <div className="w-full max-w-xl flex flex-col items-center text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-6">
          {isReady ? t("reflection_label_ready") : t("reflection_label_waiting")}
        </p>

        <CircularProgress
          value={requestedSeconds - remaining}
          max={requestedSeconds}
          size={200}
          strokeWidth={12}
          color="hsl(var(--primary))"
        >
          {isReady ? (
            <span className="text-4xl">🌿</span>
          ) : (
            <>
              <span className="text-5xl font-bold text-foreground tabular-nums">
                {remaining}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("reflection_seconds_unit")}
              </span>
            </>
          )}
        </CircularProgress>

        <div className="mt-8 mb-2 flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground break-all">
            {siteLabel}
          </h1>
          {groupName && (
            <Badge variant="secondary" className="rounded-full">
              {groupName}
            </Badge>
          )}
        </div>

        {/* The layout below is fixed height so nothing shifts when the
            countdown finishes and the question appears. */}
        <div className="min-h-[190px] w-full flex flex-col items-center justify-start">
          <p className="text-lg text-muted-foreground max-w-md">
            {isReady ? t("reflection_question") : t("reflection_hint")}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              className="rounded-2xl min-w-[190px]"
              onClick={handleProceed}
              disabled={!isReady || isDeciding || !originalUrl}
            >
              {t("reflection_button_yes")}
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl min-w-[190px] bg-white/70 backdrop-blur"
              onClick={handleDismiss}
              disabled={isDeciding}
            >
              <X size={18} className="mr-2" />
              {t("reflection_button_no")}
            </Button>
          </div>
        </div>

        {(opensToday > 0 || dismissedToday > 0) && (
          <p className="mt-6 text-xs text-muted-foreground">
            {t("reflection_today_summary", [
              String(opensToday),
              String(dismissedToday),
            ])}
          </p>
        )}
      </div>
    </PageTemplate>
  );
};

export default ReflectionPage;

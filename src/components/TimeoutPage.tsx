import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import PageTemplate from "./PageTemplate";
import * as api from "@/lib/api";
import { ACTIVITY_SUGGESTIONS } from "@/constants/suggestions";

const TimeoutPage = () => {
  // URL params
  const [blockedUrl, setBlockedUrl] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("this site");
  const [limitType, setLimitType] = useState<
    "time" | "opens" | "reflection" | "blocked"
  >("time");
  const [blockingReason, setBlockingReason] = useState<string>(
    "You've reached your daily limit"
  );
  const [resetTime, setResetTime] = useState<string>("tomorrow");

  const [currentQuote, setCurrentQuote] = useState(0);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [breatheIn, setBreatheIn] = useState(true);
  const [quotes, setQuotes] = useState<string[]>([]);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [showRandomMessage, setShowRandomMessage] = useState(true);
  const [showActivitySuggestions, setShowActivitySuggestions] = useState(true);

  // Parse URL params and load data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const url = params.get("blockedUrl") || "";
    const type =
      (params.get("limitType") as
        | "time"
        | "opens"
        | "reflection"
        | "blocked") || "time";

    // Two cases are not "you ran out of allowance", so they get their own line
    // instead of the background's English "you've exceeded…": arriving from the
    // reflection page is a choice, and a full block never had an allowance.
    let reason: string;
    if (type === "reflection") {
      reason = t("timeout_reflection_reason");
    } else if (type === "blocked") {
      reason = t("timeout_blocked_reason");
    } else {
      reason = params.get("reason") || "You've reached your daily limit";
    }

    setBlockedUrl(url);
    setBlockingReason(reason);
    setLimitType(type);

    // Extract site name from URL
    if (url) {
      try {
        const urlObj = new URL(url);
        setSiteName(urlObj.hostname);
      } catch {
        setSiteName(url);
      }
    }

    // Calculate reset time (midnight)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeString = tomorrow.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setResetTime(timeString);

    // Load timeout notes and display preferences
    loadQuotes();
    loadDisplayPreferences();
  }, []);

  const loadDisplayPreferences = async () => {
    try {
      const prefs = await api.getDisplayPreferences();
      if (prefs) {
        setShowRandomMessage(prefs.showRandomMessage !== false);
        setShowActivitySuggestions(prefs.showActivitySuggestions !== false);
      }
    } catch (error) {
      console.warn("Could not load display preferences:", error);
      // Use defaults on error - both will be true by default
    }
  };

  const loadQuotes = async () => {
    try {
      setIsLoadingQuote(true);
      const messages = await api.getMessages();
      if (messages && messages.length > 0) {
        const texts = messages.map((m) => m.text || m);
        setQuotes(texts);
        const randomIndex = Math.floor(Math.random() * texts.length);
        setCurrentQuote(randomIndex);
      } else {
        // No messages - empty state
        setQuotes([]);
        setCurrentQuote(0);
      }
    } catch (error) {
      console.error("Error loading quotes:", error);
      // On error, show empty state
      setQuotes([]);
      setCurrentQuote(0);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleOpenInfo = () => {
    window.open(browser.runtime.getURL("pages/info/index.html"), "_blank");
  };

  const shuffleQuote = () => {
    // Pick a random quote from the current pool
    if (quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setCurrentQuote(randomIndex);
    }
  };

  useEffect(() => {
    // Breathing animation
    const breatheInterval = setInterval(() => {
      setBreatheIn((prev) => !prev);
    }, 4000);

    return () => clearInterval(breatheInterval);
  }, []);

  const nextSuggestion = () => {
    setCurrentSuggestion((prev) => (prev + 1) % ACTIVITY_SUGGESTIONS.length);
  };

  const prevSuggestion = () => {
    setCurrentSuggestion((prev) => (prev - 1 + ACTIVITY_SUGGESTIONS.length) % ACTIVITY_SUGGESTIONS.length);
  };

  const visibleSuggestions = [
    ACTIVITY_SUGGESTIONS[currentSuggestion],
    ACTIVITY_SUGGESTIONS[(currentSuggestion + 1) % ACTIVITY_SUGGESTIONS.length],
    ACTIVITY_SUGGESTIONS[(currentSuggestion + 2) % ACTIVITY_SUGGESTIONS.length],
  ];

  return (
    <PageTemplate
      version=""
      onHeaderAction={handleOpenInfo}
      layout="centered"
      showVersionBadge={false}
      logoSize="sm"
    >
      {/* Breathing circle */}
        <div className="mb-10">
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center transition-transform ease-in-out ${
              breatheIn ? "scale-100" : "scale-75"
            }`}
            style={{ transitionDuration: "4s" }}
          >
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/60 flex items-center justify-center transition-transform ease-in-out ${
                breatheIn ? "scale-100" : "scale-75"
              }`}
              style={{ transitionDuration: "4s" }}
            >
              <div
                className={`w-12 h-12 rounded-full bg-primary shadow-glow flex items-center justify-center transition-transform ease-in-out ${
                  breatheIn ? "scale-100" : "scale-75"
                }`}
                style={{ transitionDuration: "4s" }}
              >
                <span className="text-primary-foreground text-[10px] font-medium">
                  {breatheIn ? t("timeout_breathing_in") : t("timeout_breathing_out")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main motivational quote - Most prominent */}
        {showRandomMessage && (
          <div className="max-w-2xl w-full text-center mb-10">
            {quotes.length > 0 ? (
              <>
                <p className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground leading-tight min-h-[200px] flex justify-center">
                  {quotes[currentQuote]}
                </p>
                {/* Quote dots */}
                {quotes.length > 1 && (
                  <div className="flex justify-center gap-3 mt-8 mb-4">
                    {quotes.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentQuote(index)}
                        className={`rounded-full transition-all ${
                          index === currentQuote
                            ? "bg-primary w-3 h-3"
                            : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2.5 h-2.5"
                        }`}
                        title={`Quote ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Randomize button */}
                <Button
                  variant="outline"
                  onClick={shuffleQuote}
                  disabled={isLoadingQuote}
                  className="rounded-full"
                >
                  {isLoadingQuote ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Shuffle size={16} className="mr-2" />
                  )}
                  Random
                </Button>
              </>
            ) : (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  {t("timeout_noMessages_title")}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("timeout_noMessages_description")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    browser.tabs.create({
                      url: browser.runtime.getURL("pages/settings/index.html"),
                    });
                  }}
                  className="rounded-full"
                >
                  {t("timeout_noMessages_button")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Suggestions carousel */}
        {showActivitySuggestions && (
          <div className="w-full max-w-3xl mb-12">
          <p className="text-center text-muted-foreground mb-4 font-medium">
            {t("timeout_suggestions_label")}
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSuggestion}
              className="shrink-0 rounded-full"
            >
              <ChevronLeft size={24} />
            </Button>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              {visibleSuggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <Card
                    key={`${suggestion.title}-${index}`}
                    className="border-0 shadow-soft bg-white/80 backdrop-blur hover:scale-105 transition-transform cursor-pointer"
                  >
                    <CardContent className="p-5 text-center">
                      <div
                        className={`w-14 h-14 rounded-2xl ${suggestion.color} flex items-center justify-center mx-auto mb-3`}
                      >
                        <Icon size={28} />
                      </div>
                      <h3 className="font-semibold mb-1">{suggestion.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSuggestion}
              className="shrink-0 rounded-full"
            >
              <ChevronRight size={24} />
            </Button>
          </div>
        </div>
        )}

        {/* Limit info - Bottom of page */}
        <div className="text-center text-muted-foreground">
          <p className="text-sm font-medium text-foreground mb-2">
            {blockingReason}
          </p>
          <p className="text-xs">
            {limitType === "reflection"
              ? t("timeout_reflection_hint", siteName)
              : limitType === "blocked"
              ? // A block does not reset at midnight, so promising a reset
                // time here would be a lie.
                t("timeout_blocked_hint", siteName)
              : t("timeout_resetTime", [siteName, resetTime])}
          </p>
      </div>
    </PageTemplate>
  );
};

export default TimeoutPage;

import { useState, useEffect } from "react";
import {
  Clock,
  Leaf,
  Lock,
  Heart,
  ExternalLink,
  Bug,
  MessageCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/utils/i18n";
import { getRatingUrl } from "@/lib/constants/rating";
import * as api from "@/lib/api";
import PageTemplate from "./PageTemplate";
import { RatingCard } from "./RatingCard";
import { getVersionFromManifest } from "@/lib/utils/manifestVersion";
import { logError, getErrorToastProps, getSuccessToastProps } from "@/lib/utils/errorHandler";
import { useToast } from "@/hooks/use-toast";

const InfoPage = () => {
  const { toast } = useToast();
  const [version, setVersion] = useState("");
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const loadVersion = async () => {
      const ver = await getVersionFromManifest();
      setVersion(ver);
    };
    loadVersion();
  }, []);

  useEffect(() => {
    const loadRatingState = async () => {
      try {
        const ratingState = await api.getRatingState();
        setHasRated(ratingState.hasRated);
      } catch (error) {
        console.warn("Could not load rating state:", error);
      }
    };
    loadRatingState();
  }, []);

  const values = [
    {
      icon: Clock,
      title: t("info_value_saveTime_title"),
      description: t("info_value_saveTime_description"),
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: Leaf,
      title: t("info_value_mindful_title"),
      description: t("info_value_mindful_description"),
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: Lock,
      title: t("info_value_privacy_title"),
      description: t("info_value_privacy_description"),
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: Heart,
      title: t("info_value_free_title"),
      description: t("info_value_free_description"),
      color: "bg-pink-100 text-pink-600",
    },
  ];

  const donations = [
    {
      name: t("info_donation_stripe"),
      icon: "$",
      link: "https://donate.stripe.com/7sYeVdfyC5H49AD02Y9MY00",
      description: t("info_donation_stripe_description"),
    },
    {
      name: t("info_donation_paypal"),
      icon: "P",
      link: "https://paypal.me/davidgodzsak",
      description: t("info_donation_paypal_description"),
    },
    {
      name: t("info_donation_buymeacoffee"),
      icon: "☕",
      link: "https://buymeacoffee.com/davidgodzsak",
      description: t("info_donation_buymeacoffee_description"),
    }
  ];

  const handleOpenSettings = () => {
    browser.runtime.openOptionsPage().catch(() => {
      // Fallback: open settings page directly
      browser.tabs.create({
        url: browser.runtime.getURL("ui/settings/settings.html"),
      });
    });
  };

  const handleRateNow = async () => {
    try {
      await api.markRated();
      const ratingUrl = getRatingUrl();
      browser.tabs.create({ url: ratingUrl });
      toast(getSuccessToastProps(t("settings_rating_thankYou")));
      setHasRated(true);
    } catch (error) {
      logError("Error rating extension", error);
      toast(getErrorToastProps(t("settings_rating_error")));
    }
  };

  return (
    <PageTemplate
      version={version}
      onOpenInfo={handleOpenSettings}
      layout="normal"
      showVersionBadge={true}
      logoSize="sm"
    >
      {/* Intro section */}
      <div className="max-w-2xl w-full text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
          {t("info_title")}
        </h2>
        <p className="text-lg text-foreground/80 leading-relaxed">
          {t("info_description")}
        </p>
      </div>

      {/* Values grid */}
      <div className="max-w-4xl w-full mb-16">
        <h3 className="text-2xl font-semibold text-foreground text-center mb-8">
          {t("info_values_title")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card
                key={value.title}
                className="border-0 shadow-soft bg-white/80 backdrop-blur hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-2xl ${value.color} flex items-center justify-center mb-4`}
                  >
                    <Icon size={24} />
                  </div>
                  <h4 className="font-semibold text-lg text-foreground mb-2">
                    {value.title}
                  </h4>
                  <p className="text-sm text-foreground/70">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Setup section */}
      <div className="max-w-2xl w-full mb-12">
        <div className="text-center">
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            {t("info_setup_title")}
          </h3>
          <p className="text-sm text-foreground/70 mb-6">
            {t("info_setup_description")}
          </p>
          <Button
            onClick={handleOpenSettings}
            size="lg"
            className="rounded-full bg-primary hover:bg-primary/90 gap-2 px-8 py-6 text-base"
          >
            <Settings size={20} />
            {t("info_setup_button")}
          </Button>
        </div>
      </div>

      {/* Rating section */}
      {!hasRated && (
        <div className="max-w-2xl w-full mb-12">
          <RatingCard
            onRate={handleRateNow}
            onAlreadyRated={async () => {
              try {
                await api.markRated();
                toast(getSuccessToastProps(t("settings_rating_thankYou")));
                setHasRated(true);
              } catch (error) {
                logError("Error marking rated", error);
                toast(getErrorToastProps(t("settings_rating_error")));
              }
            }}
          />
        </div>
      )}

      {/* Donation section */}
      <div className="max-w-2xl w-full mb-16">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold text-foreground mb-2">
            {t("info_donation_title")}
          </h3>
          <p className="text-foreground/70">
            {t("info_donation_description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {donations.map((donation) => (
            <a
              key={donation.name}
              href={donation.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="border-0 shadow-soft bg-white/80 backdrop-blur hover:shadow-lg hover:scale-105 transition-all cursor-pointer h-full">
                <CardContent className="p-5 text-center flex flex-col items-center justify-center h-full">
                  <div className="text-3xl mb-3 font-bold text-primary">
                    {donation.icon}
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">
                    {donation.name}
                  </h4>
                  <p className="text-sm text-foreground/60 mb-3">
                    {donation.description}
                  </p>
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    {t("info_donation_link")} <ExternalLink size={14} />
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>

      {/* Links section */}
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold text-foreground mb-2">
            {t("info_feedback_title")}
          </h3>
          <p className="text-foreground/70 mb-6">
            {t("info_feedback_description")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com/davidgodzsak/time-limit/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-full gap-2 border-foreground/20 hover:bg-white/50"
            >
              <Bug size={18} />
              {t("info_feedback_reportIssue")}
            </Button>
          </a>
          <a
            href="https://github.com/davidgodzsak/time-limit/discussions"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-full gap-2 border-foreground/20 hover:bg-white/50"
            >
              <MessageCircle size={18} />
              {t("info_feedback_featureRequest")}
            </Button>
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-white/20 text-sm text-foreground/60">
        <p>
          {t("info_footer")}
        </p>
      </div>
    </PageTemplate>
  );
};

export default InfoPage;

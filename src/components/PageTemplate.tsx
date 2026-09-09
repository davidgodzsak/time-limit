import { ReactNode } from "react";
import { Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/utils/i18n";
import Logo from "./Logo";

interface PageTemplateProps {
  children: ReactNode;
  version?: string;
  /**
   * Which page the header shortcut leads to. The info page points back at
   * settings (cogwheel); every other page points at the info page.
   */
  headerAction?: "info" | "settings";
  onHeaderAction: () => void;
  layout?: "centered" | "normal"; // "centered" = TimeoutPage, "normal" = SettingsPage/InfoPage
  showVersionBadge?: boolean;
  logoSize?: "sm" | "md";
  headerStyle?: "minimal" | "glass"; // "minimal" = clean, "glass" = frosted glass effect
}

const PageTemplate = ({
  children,
  version,
  headerAction = "info",
  onHeaderAction,
  layout = "normal",
  showVersionBadge = true,
  logoSize = "md",
  headerStyle = "minimal",
}: PageTemplateProps) => {
  const isCentered = layout === "centered";
  const isMinimal = headerStyle === "minimal";
  const HeaderIcon = headerAction === "settings" ? Settings : Info;
  const headerTitle =
    headerAction === "settings"
      ? t("firstInstallView_button_openSettings")
      : t("normalPageView_button_tooltip");

  // One definition for all three header layouts, so the icon and its target
  // cannot drift apart per layout.
  const headerButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={onHeaderAction}
      className="hover:bg-white/20 text-foreground"
      title={headerTitle}
    >
      <HeaderIcon size={20} />
    </Button>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        {/* Floating shapes */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 min-h-screen flex flex-col ${
          isCentered ? "items-center justify-center p-6" : ""
        }`}
      >
        {/* Header */}
        {isCentered ? (
          // Centered layout: Absolute positioned header (TimeoutPage style)
          <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
            <Logo size={logoSize} />
            {headerButton}
          </div>
        ) : isMinimal ? (
          // Normal layout with minimal header style
          <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4">
            <Logo size={logoSize} />
            <div className="flex items-center gap-3">
              {showVersionBadge && version && (
                <Badge variant="secondary" className="bg-white/30 backdrop-blur">
                  v{version}
                </Badge>
              )}
              {headerButton}
            </div>
          </header>
        ) : (
          // Normal layout with glass header style (legacy)
          <header className="sticky top-0 z-10 glass border-b border-white/20">
            <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
              <Logo size={logoSize} />
              <div className="flex items-center gap-3">
                {showVersionBadge && version && (
                  <Badge variant="secondary" className="bg-white/30 backdrop-blur">
                    v{version}
                  </Badge>
                )}
                {headerButton}
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        {isCentered ? (
          // Centered layout: content goes directly here
          children
        ) : (
          // Normal layout: content in main with max-width constraint, centered
          <main className="flex-1 w-full px-6 py-8 flex flex-col items-center">
            {children}
          </main>
        )}
      </div>
    </div>
  );
};

export default PageTemplate;

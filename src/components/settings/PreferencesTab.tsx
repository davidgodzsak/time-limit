import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { t, AVAILABLE_LANGUAGES } from "@/lib/utils/i18n";

const LANGUAGE_AUTO = "__auto__";

interface PreferencesTabProps {
  showRandomMessage: boolean;
  onToggleRandomMessage: (checked: boolean) => void;
  showActivitySuggestions: boolean;
  onToggleActivitySuggestions: (checked: boolean) => void;
  preferredLanguage: string | null;
  onChangeLanguage: (lang: string | null) => void;
  isSaving: boolean;
}

export function PreferencesTab({
  showRandomMessage,
  onToggleRandomMessage,
  showActivitySuggestions,
  onToggleActivitySuggestions,
  preferredLanguage,
  onChangeLanguage,
  isSaving,
}: PreferencesTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t("preferences_section_title")}</h2>
        <p className="text-muted-foreground">{t("preferences_section_description")}</p>
      </div>

      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="text-lg">{t("messages_display_options_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("messages_option_randomMessage")}</p>
              <p className="text-sm text-muted-foreground">
                {t("messages_option_randomMessage_description")}
              </p>
            </div>
            <Switch
              checked={showRandomMessage}
              onCheckedChange={onToggleRandomMessage}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("messages_option_suggestions")}</p>
              <p className="text-sm text-muted-foreground">
                {t("messages_option_suggestions_description")}
              </p>
            </div>
            <Switch
              checked={showActivitySuggestions}
              onCheckedChange={onToggleActivitySuggestions}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium">{t("settings_language_label")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings_language_description")}
              </p>
            </div>
            <Select
              value={preferredLanguage ?? LANGUAGE_AUTO}
              onValueChange={(value) =>
                onChangeLanguage(value === LANGUAGE_AUTO ? null : value)
              }
              disabled={isSaving}
            >
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LANGUAGE_AUTO}>
                  {t("settings_language_auto")}
                </SelectItem>
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

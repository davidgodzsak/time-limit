import { Button } from "@/components/ui/button";
import { t } from "@/lib/utils/i18n";

/** The delays offered everywhere the reflection pause can be set. */
const REFLECTION_DELAY_OPTIONS = [5, 10, 15];

interface ReflectionDelayPickerProps {
  /** Seconds of pause, or undefined when the site opens straight away. */
  value?: number;
  onChange: (seconds: number | undefined) => void;
  disabled?: boolean;
  /** Adds an explicit "Off" choice — used where the value must be clearable. */
  includeOff?: boolean;
  size?: "sm" | "default";
}

/**
 * Picks how long to pause before a site opens. Clicking the selected value
 * again clears it, so the popup can offer the same control without an Off
 * button taking up a column.
 */
export function ReflectionDelayPicker({
  value,
  onChange,
  disabled = false,
  includeOff = false,
  size = "sm",
}: ReflectionDelayPickerProps) {
  const select = (seconds: number) =>
    onChange(value === seconds ? undefined : seconds);

  return (
    <div
      className={`grid gap-2 ${includeOff ? "grid-cols-4" : "grid-cols-3"}`}
    >
      {includeOff && (
        <Button
          type="button"
          variant={!value ? "default" : "outline"}
          size={size}
          className={`rounded-xl ${
            value ? "border-primary/30 hover:bg-primary/10 hover:border-primary" : ""
          }`}
          onClick={() => onChange(undefined)}
          disabled={disabled}
        >
          {t("reflection_option_off")}
        </Button>
      )}
      {REFLECTION_DELAY_OPTIONS.map((seconds) => (
        <Button
          key={seconds}
          type="button"
          variant={value === seconds ? "default" : "outline"}
          size={size}
          className={`rounded-xl ${
            value === seconds
              ? ""
              : "border-primary/30 hover:bg-primary/10 hover:border-primary"
          }`}
          onClick={() => select(seconds)}
          disabled={disabled}
        >
          {t("reflection_option_seconds", String(seconds))}
        </Button>
      ))}
    </div>
  );
}

export default ReflectionDelayPicker;

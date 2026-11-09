import type { ReactNode } from "react";

interface Option<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/** A pill row of choices, styled like the Settings tab bar. */
export function SegmentedControl<T extends string | number>({ value, options, onChange, label, className = "" }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-2xl p-1 bg-muted/80 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-xl transition-all inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === option.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

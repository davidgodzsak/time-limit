import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { STATS_CARD } from "./styles";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  format: (value: number) => string;
  footer: ReactNode;
  delayMs?: number;
}

/** One headline number that counts up into place. */
export function KpiCard({ icon, label, value, format, footer, delayMs = 0 }: KpiCardProps) {
  const shown = useCountUp(value);
  return (
    <Card className={`${STATS_CARD} p-5 stats-fade-up`} style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">{format(shown)}</div>
      <div className="mt-1 min-h-[18px]">{footer}</div>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getIconSources,
  getIconSourcesSync,
  iconHost,
  markIconSourceFailed,
} from "@/lib/siteIcons";

interface SiteIconProps {
  /** A stored pattern, a hostname or a URL. */
  site: string | null | undefined;
  /** An icon known to be right, tried first (the popup passes the tab's own). */
  src?: string;
  /** Edge length in pixels. */
  size?: number;
  className?: string;
}

/**
 * A site's favicon, or its first letter when there is none to show. Sources
 * and caching are decided in `lib/siteIcons.ts`.
 */
export function SiteIcon({ site, src, size = 20, className }: SiteIconProps) {
  const host = useMemo(() => iconHost(site), [site]);
  const [sources, setSources] = useState<string[] | null>(() =>
    getIconSourcesSync(host, src)
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIndex(0);
    const known = getIconSourcesSync(host, src);
    if (known) {
      setSources(known);
    } else {
      getIconSources(host, src).then((loaded) => {
        if (!cancelled) setSources(loaded);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [host, src]);

  const current = sources?.[index];
  const letter = (host ?? site ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        !current && "bg-muted text-muted-foreground font-semibold",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      aria-hidden="true"
    >
      {current ? (
        <img
          key={current}
          src={current}
          width={size}
          height={size}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={() => {
            markIconSourceFailed(current);
            setIndex((i) => i + 1);
          }}
        />
      ) : (
        letter
      )}
    </span>
  );
}

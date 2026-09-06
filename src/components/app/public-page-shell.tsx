"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { journeyThemes, resolveJourney } from "@/lib/journeys";

type PageShellStyle = CSSProperties & { "--page-background": string };

export function PublicPageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  const journey = resolveJourney(pathname, searchParams);
  const theme = journeyThemes[journey];

  return (
    <div
      className="page-shell"
      data-journey={journey}
      style={{ "--page-background": theme.background } as PageShellStyle}
    >
      {children}
    </div>
  );
}

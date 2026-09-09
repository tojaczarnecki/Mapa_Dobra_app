"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { journeyThemes, resolveJourney } from "@/lib/journeys";
import type { SystemState } from "@/lib/system/settings";
import { useState } from "react";

type PageShellStyle = CSSProperties & { "--page-background": string };

export function PublicPageShell({ children, systemState }: { children: ReactNode; systemState: SystemState }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  if (systemState.mode === "MAINTENANCE") {
    return <><meta name="robots" content="noindex, nofollow" /><MaintenanceScreen state={systemState} /></>;
  }

  const journey = resolveJourney(pathname, searchParams);
  const theme = journeyThemes[journey];

  return (
    <div
      className="page-shell"
      data-journey={journey}
      style={{ "--page-background": theme.background } as PageShellStyle}
    >
      <PublicSystemNotice state={systemState} />
      {children}
    </div>
  );
}

function PublicSystemNotice({ state }: { state: SystemState }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !state.noticeEnabled || !state.noticeText) return null;
  const canDismiss = state.noticeDismissible && state.noticeLevel !== "CRITICAL";

  return (
    <aside className={`public-system-notice public-system-notice-${state.noticeLevel.toLowerCase()}`} role={state.noticeLevel === "CRITICAL" ? "alert" : "status"}>
      <div><strong>{state.noticeLevel === "WARNING" ? "Ważny komunikat" : state.noticeLevel === "CRITICAL" ? "Pilny komunikat" : "Komunikat"}</strong><p>{state.noticeText}</p></div>
      {canDismiss ? <button type="button" onClick={() => setDismissed(true)} aria-label="Zamknij komunikat">×</button> : null}
    </aside>
  );
}

export function MaintenanceScreen({ state }: { state: SystemState }) {
  return (
    <section className="public-maintenance-screen" aria-labelledby="maintenance-title">
      <div className="public-maintenance-content">
        <p className="public-maintenance-eyebrow">DOBRA MAPA</p>
        <h1 id="maintenance-title">{state.maintenanceTitle}</h1>
        <p className="public-maintenance-message">{state.maintenanceMessage}</p>
        <div className="public-maintenance-emergency" role="alert">
          <strong>Jeśli sytuacja zagraża życiu lub zdrowiu, zadzwoń pod numer 112.</strong>
          <a href="tel:112">ZADZWOŃ 112</a>
        </div>
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";

type Journey = "search" | "help" | "now" | "guide";

export function JourneyMotif({ journey }: { journey: Journey }) {
  return (
    <svg className="journey-motif" viewBox="0 0 80 56" aria-hidden="true" style={{ "--journey-accent": `var(--journey-${journey})` } as CSSProperties}>
      <path d="M8 42c13-18 22-27 34-27 10 0 13 10 20 10 4 0 7-2 10-7" />
      {journey === "search" ? <><circle cx="26" cy="26" r="9" /><path d="m33 33 9 9" /></> : null}
      {journey === "help" ? <><path d="M22 24c-5-7-16-1-12 7l12 12 12-12c4-8-7-14-12-7Z" /><path d="M49 22h15m-7-7 7 7-7 7" /></> : null}
      {journey === "now" ? <><circle cx="28" cy="28" r="11" /><circle cx="28" cy="28" r="3" /><path d="M28 10v7m0 22v7M10 28h7m22 0h7" /></> : null}
      {journey === "guide" ? <><path d="M18 39c8-12 13-18 22-18 7 0 10 5 16 5" /><path d="m48 19 8 7-8 7" /><circle cx="22" cy="17" r="6" /></> : null}
    </svg>
  );
}

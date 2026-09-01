import type { ReactNode } from "react";
import { StatusIndicator } from "./status-indicator";

type FreshnessKind = "confirmed" | "current" | "needsConfirmation" | "stale" | "unknown";

const statusByFreshness = {
  confirmed: "confirmed",
  current: "confirmed",
  needsConfirmation: "unknown",
  stale: "unknown",
  unknown: "unknown",
} as const;

export function DataFreshness({ kind, children, className = "" }: { kind: FreshnessKind; children: ReactNode; className?: string }) {
  return (
    <StatusIndicator status={statusByFreshness[kind]} className={className}>
      {children}
    </StatusIndicator>
  );
}

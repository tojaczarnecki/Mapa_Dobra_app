import type { ReactNode } from "react";
import { StatusIndicator } from "./status-indicator";

export function UnknownDataNotice({ children = "Nie mamy jeszcze potwierdzonych informacji." }: { children?: ReactNode }) {
  return (
    <p className="text-sm font-semibold leading-6 text-muted-foreground">
      <StatusIndicator status="unknown">{children}</StatusIndicator>
    </p>
  );
}

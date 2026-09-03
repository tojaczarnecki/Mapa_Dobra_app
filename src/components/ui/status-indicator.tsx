import type { HTMLAttributes, ReactNode } from "react";
import { publicStatusLabel, publicStatusSymbol, type PublicStatus } from "@/lib/public/status-presentation";

type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement> & {
  status: PublicStatus;
  children: ReactNode;
  announceLabel?: boolean;
};

export function StatusIndicator({ status, children, className = "", announceLabel = true, ...props }: StatusIndicatorProps) {
  return (
    <span className={["inline-flex min-w-0 items-center gap-1.5", className].join(" ")} {...props}>
      <span aria-hidden="true" className="shrink-0 font-extrabold">{publicStatusSymbol[status]}</span>
      <span className="min-w-0">{children}</span>
      {announceLabel ? <span className="sr-only">{publicStatusLabel[status]}</span> : null}
    </span>
  );
}

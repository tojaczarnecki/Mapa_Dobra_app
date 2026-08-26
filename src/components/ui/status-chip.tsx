import type { HTMLAttributes, ReactNode } from "react";

type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "positive" | "warning" | "danger" | "unknown" | "info";
  icon?: ReactNode;
};

export function StatusChip({ className = "", tone = "info", icon, children, ...props }: StatusChipProps) {
  return (
    <span
      className={[
        "ui-status-chip inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold",
        `ui-status-chip-${tone}`,
        className,
      ].join(" ")}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

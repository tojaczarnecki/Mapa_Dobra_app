import type { HTMLAttributes } from "react";

type StatusChipProps = HTMLAttributes<HTMLSpanElement>;

export function StatusChip({ className = "", ...props }: StatusChipProps) {
  return (
    <span
      className={[
        "inline-flex min-h-8 items-center rounded-full border border-border bg-surface-muted px-3 text-sm font-semibold text-foreground",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

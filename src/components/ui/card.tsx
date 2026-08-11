import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-border bg-surface shadow-[0_16px_40px_rgb(17_24_39_/_6%)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "touch-target inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-strong active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-4 focus-visible:ring-brand-strong/35",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

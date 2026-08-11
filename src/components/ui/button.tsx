import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "touch-target inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-base font-bold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

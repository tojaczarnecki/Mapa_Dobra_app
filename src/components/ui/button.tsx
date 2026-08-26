import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "ui-button-primary",
  secondary: "ui-button-secondary",
  ghost: "ui-button-ghost",
  danger: "ui-button-danger",
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={[
        "ui-button touch-target inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    />
  );
}

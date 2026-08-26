import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  label: string;
  helperText?: string;
  error?: string;
};

export function TextField({
  icon,
  label,
  id,
  helperText,
  error,
  className = "",
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name ?? "text-field";
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 text-brand">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-invalid={error ? true : undefined}
          className={[
            "ui-input touch-target w-full rounded-lg border bg-white px-4 py-3 text-base text-foreground transition placeholder:text-slate-500 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 read-only:bg-surface-muted",
            error ? "border-danger" : "border-border",
            icon ? "pl-12" : "",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
      {error ? <p id={errorId} className="ui-field-error" role="alert">{error}</p> : helperText ? <p id={helperId} className="ui-field-helper">{helperText}</p> : null}
    </div>
  );
}

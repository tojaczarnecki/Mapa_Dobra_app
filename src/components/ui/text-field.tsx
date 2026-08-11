import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  label: string;
};

export function TextField({
  icon,
  label,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name ?? "text-field";

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
          className={[
            "touch-target w-full rounded-lg border border-border bg-white px-4 py-3 text-base text-foreground shadow-sm transition placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/35",
            icon ? "pl-12" : "",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    </div>
  );
}

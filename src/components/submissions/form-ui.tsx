import Link from "next/link";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

export const formControlClass =
  "touch-target w-full min-w-0 rounded-lg border border-border bg-white px-3.5 py-3 text-base text-foreground shadow-sm transition placeholder:text-muted-foreground hover:border-brand focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/30 disabled:cursor-not-allowed disabled:bg-surface-muted";

export const formSelectClass = `${formControlClass} pr-10`;

export function FormError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-bold leading-5 text-urgent" role="alert">
      <span aria-hidden="true">!</span>
      <span>{children}</span>
    </p>
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-extrabold leading-5 text-foreground">
        {label}
        {required ? <span className="ml-1 text-urgent">(wymagane)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm font-semibold leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      <FormError id={`${id}-error`}>{error}</FormError>
    </div>
  );
}

export function fieldDescriptionIds(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ") || undefined;
}

export function FormSection({
  title,
  description,
  children,
  compact = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={[
        compact ? "min-w-0 space-y-3" : "min-w-0 space-y-4",
        className,
      ].join(" ")}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm font-semibold leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type OptionCardProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  type: "checkbox" | "radio";
  label: string;
  description?: string;
  compact?: boolean;
};

export function OptionCard({
  type,
  label,
  description,
  checked,
  compact = false,
  className = "",
  ...props
}: OptionCardProps) {
  return (
    <label
      className={[
        compact
          ? "flex min-h-14 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 text-left transition"
          : "flex min-h-14 min-w-0 cursor-pointer items-start gap-3 rounded-lg border bg-surface px-3.5 py-3 text-left transition",
        checked
          ? "border-brand bg-brand-soft shadow-[0_0_0_1px_var(--brand)]"
          : "border-border hover:border-brand hover:bg-brand-soft/50",
        className,
      ].join(" ")}
    >
      <input
        type={type}
        checked={checked}
        className={`${compact ? "" : "mt-0.5"} h-5 w-5 shrink-0 accent-[var(--brand-strong)]`}
        {...props}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold leading-5 text-foreground sm:text-base">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-sm font-semibold leading-5 text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {checked ? (
        <Check
          aria-hidden="true"
          className={`${compact ? "" : "mt-0.5"} shrink-0 text-brand-strong`}
          size={19}
        />
      ) : null}
    </label>
  );
}

export function MultiSelectOption(props: Omit<OptionCardProps, "type">) {
  return <OptionCard type="checkbox" {...props} />;
}

export function SubmissionStepper({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  return (
    <div className="space-y-2" aria-label={`Postęp formularza: krok ${current} z ${total}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-brand-strong" aria-live="polite">
          Krok {current} z {total}
        </p>
        <p className="text-sm font-bold text-muted-foreground">{label}</p>
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={[
              "h-1.5 rounded-full",
              index < current ? "bg-brand" : "bg-surface-muted",
            ].join(" ")}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

export function StepActions({
  backLabel = "Wstecz",
  nextLabel = "Dalej",
  onBack,
  onNext,
  nextType = "button",
}: {
  backLabel?: string;
  nextLabel?: string;
  onBack?: () => void;
  onNext?: () => void;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
      {onBack ? (
        <button
          type="button"
          className="touch-target inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-base font-extrabold text-foreground transition hover:border-brand hover:bg-brand-soft"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" size={19} />
          {backLabel}
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <button
        type={nextType}
        className="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-base font-extrabold text-foreground shadow-sm transition hover:bg-brand-strong hover:text-white"
        onClick={nextType === "button" ? onNext : undefined}
      >
        {nextLabel}
        {nextType === "button" ? <ChevronRight aria-hidden="true" size={19} /> : null}
      </button>
    </div>
  );
}

export type SummaryItem = {
  label: string;
  value: string;
  editStep?: number;
};

export function SubmissionSummary({
  items,
  onEdit,
}: {
  items: SummaryItem[];
  onEdit: (step: number) => void;
}) {
  return (
    <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <div key={item.label} className="grid min-w-0 gap-1 px-3.5 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start sm:gap-3">
          <dt className="text-sm font-bold text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 whitespace-pre-line text-sm font-semibold leading-5 text-foreground">
            {item.value || "Nie podano"}
          </dd>
          {typeof item.editStep === "number" ? (
            <button
              type="button"
              className="touch-target -ml-2 inline-flex w-fit items-center gap-1.5 rounded-md px-2 text-sm font-extrabold text-brand-strong hover:bg-brand-soft hover:text-foreground sm:-my-2 sm:ml-0"
              onClick={() => onEdit(item.editStep as number)}
              aria-label={`Edytuj: ${item.label}`}
            >
              <Pencil aria-hidden="true" size={16} />
              Edytuj
            </button>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function FormSuccess({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-brand bg-surface p-5 shadow-[0_16px_40px_rgb(17_24_39_/_7%)] sm:p-7" role="status" tabIndex={-1}>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
        <CheckCircle2 aria-hidden="true" size={27} />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <div className="mt-2 max-w-2xl text-base font-semibold leading-7 text-muted-foreground">
        {children}
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">{actions}</div>
    </section>
  );
}

export function SuccessLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "touch-target inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-base font-extrabold transition",
        primary
          ? "border-brand bg-brand text-foreground hover:bg-brand-strong hover:text-white"
          : "border-border bg-surface text-foreground hover:border-brand hover:bg-brand-soft",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

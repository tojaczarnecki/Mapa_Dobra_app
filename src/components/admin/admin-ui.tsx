import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, description, backHref, backLabel = "Wróć", action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref ? <Link href={backHref} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={17} />{backLabel}</Link> : null}
        {eyebrow ? <p className="text-sm font-bold text-brand-strong">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function AdminSection({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-white ${className}`}>
      {title || description || action ? <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><div>{title ? <h2 className="text-lg font-bold">{title}</h2> : null}{description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}</div> : null}
      {children}
    </section>
  );
}

export function AdminEmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border bg-white px-5 py-10 text-center"><h2 className="font-bold">{title}</h2>{description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function AdminFilterBar({ children, resultCount, resetHref }: { children: ReactNode; resultCount?: string; resetHref?: string }) {
  return <div className="space-y-3"><form method="get" className="grid gap-3 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">{children}</form>{resultCount || resetHref ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm">{resultCount ? <p className="font-bold">{resultCount}</p> : <span />}{resetHref ? <Link href={resetHref} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 font-bold text-brand-strong hover:bg-brand-soft">Wyczyść filtry<ArrowRight aria-hidden="true" size={16} /></Link> : null}</div> : null}</div>;
}

export function AdminActionButton({ children, href, variant = "primary", type = "button", disabled = false }: { children: ReactNode; href?: string; variant?: "primary" | "secondary" | "tertiary"; type?: "button" | "submit"; disabled?: boolean }) {
  const classes = variant === "primary"
    ? "bg-brand text-[#10231e] hover:bg-brand-strong hover:text-white"
    : variant === "secondary"
      ? "border border-brand text-brand-strong hover:bg-brand-soft"
      : "text-brand-strong hover:bg-brand-soft";
  if (href) return <Link href={href} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${variant !== "tertiary" ? "border" : ""} ${classes}`}>{children}</Link>;
  return <button type={type} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${variant !== "tertiary" ? "border" : ""} ${classes}`}>{children}</button>;
}

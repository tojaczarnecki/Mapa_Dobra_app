import type { ReactNode } from "react";

export function DetailSection({
  title,
  description,
  privateData = false,
  children,
}: {
  title: string;
  description?: string;
  privateData?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {privateData ? (
          <span className="rounded-full border border-urgent/35 bg-urgent-soft px-2.5 py-1 text-xs font-bold text-[#8c2d0c]">
            Dane prywatne
          </span>
        ) : null}
      </div>
      {description ? <p className="mb-4 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      {children}
    </section>
  );
}

export function InfoRows({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm font-bold text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words text-sm leading-6">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-border bg-[#f8f6f0] px-3 py-1.5 text-sm font-semibold">
          {item}
        </li>
      ))}
    </ul>
  );
}

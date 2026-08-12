import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminSubmissionSummary } from "@/lib/admin/submissions";
import { formatAdminDate } from "@/lib/admin/labels";

export function SubmissionList({
  items,
  compact = false,
}: {
  items: AdminSubmissionSummary[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white px-5 py-9 text-center text-sm text-muted-foreground">
        Brak zgłoszeń pasujących do wybranych filtrów.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_150px_130px_32px] gap-4 border-b border-border bg-[#f5f3ed] px-5 py-3 text-xs font-bold uppercase text-muted-foreground md:grid">
        <span>Zgłoszenie</span>
        <span>Dotyczy</span>
        <span>Data</span>
        <span>Status</span>
        <span className="sr-only">Otwórz</span>
      </div>
      <ol className="divide-y divide-border">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              href={`/admin/zgloszenia/${item.id}`}
                className={`grid min-w-0 gap-2.5 px-4 transition hover:bg-brand-soft/45 sm:px-5 md:grid-cols-[minmax(0,1.4fr)_minmax(150px,.8fr)_150px_130px_32px] md:items-center md:gap-4 ${compact ? "py-3" : "py-3.5"}`}
            >
              <div className="min-w-0">
                <span className="mb-1 block text-xs font-bold text-brand-strong">{item.typeLabel}</span>
                <strong className="block truncate text-sm">{item.name}</strong>
                {item.source ? (
                  <span className="mt-1 block truncate text-xs text-muted-foreground md:hidden">
                    Źródło: {item.source}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.subject || "Nie określono"}</p>
              <time className="text-xs text-muted-foreground" dateTime={item.createdAt.toISOString()}>
                {formatAdminDate(item.createdAt)}
              </time>
              <StatusBadge status={item.status} />
              <ArrowRight aria-hidden="true" className="hidden text-brand-strong md:block" size={19} />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

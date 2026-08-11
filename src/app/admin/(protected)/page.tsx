import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { SubmissionList } from "@/components/admin/submission-list";
import { moderationStatusLabels } from "@/lib/admin/labels";
import { getDashboardData } from "@/lib/admin/submissions";

const metricDescriptions = {
  PENDING: "Do weryfikacji",
  UNDER_REVIEW: "W trakcie weryfikacji",
  APPROVED: "Zatwierdzone",
  REJECTED: "Odrzucone",
} as const;

const metricLinks = {
  PENDING: "/admin/zgloszenia?status=pending",
  UNDER_REVIEW: "/admin/zgloszenia?status=under-review",
  APPROVED: "/admin/zgloszenia?status=approved",
  REJECTED: "/admin/zgloszenia?status=rejected",
} as const;

export default async function AdminDashboardPage() {
  const { metrics, latest } = await getDashboardData();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold text-brand-strong">Panel administratora</p>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stan kolejki publicznych zgłoszeń Mapy Dobra.
          </p>
        </div>
        <Link
          href="/admin/zgloszenia?status=pending"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white"
        >
          <ClipboardCheck aria-hidden="true" size={19} />
          Otwórz kolejkę
        </Link>
      </header>

      <section aria-labelledby="queue-status-heading">
        <h2 id="queue-status-heading" className="mb-4 text-lg font-bold">
          Status zgłoszeń
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.status}
              href={metricLinks[metric.status]}
              className="rounded-lg border border-border bg-white p-5 transition hover:border-brand hover:shadow-sm"
              aria-label={`${moderationStatusLabels[metric.status]}: ${metric.total}`}
            >
              <p className="text-sm font-bold text-muted-foreground">
                {metricDescriptions[metric.status]}
              </p>
              <p className="mt-2 text-3xl font-bold">{metric.total}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Zmiany: <strong className="text-foreground">{metric.placeUpdates}</strong></span>
                <span>Nowe: <strong className="text-foreground">{metric.newPlaces}</strong></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="latest-heading">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="latest-heading" className="text-lg font-bold">Najnowsze zgłoszenia</h2>
          <Link
            href="/admin/zgloszenia"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
          >
            Wszystkie
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
        <SubmissionList items={latest} compact />
      </section>
    </div>
  );
}

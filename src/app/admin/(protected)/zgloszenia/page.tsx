import { Filter } from "lucide-react";
import { SubmissionList } from "@/components/admin/submission-list";
import { getSubmissionSummaries } from "@/lib/admin/submissions";
import type { ModerationStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/lib/admin/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statusValues: Record<string, ModerationStatus | undefined> = {
  all: undefined,
  pending: "PENDING",
  "under-review": "UNDER_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
};

const kindValues = {
  all: undefined,
  update: "place-update",
  new: "new-place",
} as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("MODERATE_SUBMISSIONS");
  const params = await searchParams;
  const statusKey = firstValue(params.status) ?? "all";
  const typeKey = firstValue(params.type) ?? "all";
  const sortValue = firstValue(params.sort) === "oldest" ? "oldest" : "newest";
  const status = statusValues[statusKey] ?? undefined;
  const kind = kindValues[typeKey as keyof typeof kindValues];
  const items = await getSubmissionSummaries({ status, kind, sort: sortValue });

  return (
    <div className="space-y-5">
      <header>
        <p className="mb-1 text-sm font-bold text-brand-strong">Moderacja</p>
        <h1 className="text-3xl font-bold">Zgłoszenia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "zgłoszenie" : "zgłoszeń"} w bieżącym widoku
        </p>
      </header>

      <form
        method="get"
        className="grid gap-2.5 rounded-lg border border-border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
      >
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Status</span>
          <select
            name="status"
            defaultValue={statusKey in statusValues ? statusKey : "all"}
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal"
          >
            <option value="all">Wszystkie</option>
            <option value="pending">Oczekujące</option>
            <option value="under-review">W trakcie</option>
            <option value="approved">Zatwierdzone</option>
            <option value="rejected">Odrzucone</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Typ</span>
          <select
            name="type"
            defaultValue={typeKey in kindValues ? typeKey : "all"}
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal"
          >
            <option value="all">Wszystkie</option>
            <option value="update">Zmiana miejsca</option>
            <option value="new">Nowe miejsce</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          <span className="mb-1.5 block">Sortowanie</span>
          <select
            name="sort"
            defaultValue={sortValue}
            className="min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 font-normal"
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white"
        >
          <Filter aria-hidden="true" size={18} />
          Zastosuj
        </button>
      </form>

      <SubmissionList items={items} />
    </div>
  );
}

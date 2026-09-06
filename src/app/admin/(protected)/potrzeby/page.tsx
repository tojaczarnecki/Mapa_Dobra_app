import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { AdminNeedsList } from "@/components/admin/needs/admin-needs-list";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export default async function AdminNeedsPage() {
  await requirePermission("MANAGE_VOLUNTEER_NEEDS");
  const needs = await prisma.organizationNeed.findMany({
    include: {
      organization: { select: { name: true } },
      place: { select: { name: true, addressLine: true } },
      responses: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { createdAt: "desc" }],
  });

  return <div className="space-y-5">
    <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} />Panel administratora</Link>
    <header className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 sm:p-5">
      <ClipboardList aria-hidden="true" className="mt-1 shrink-0 text-brand-strong" size={24} />
      <div><h1 className="text-2xl font-extrabold sm:text-3xl">Potrzeby</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">Globalny widok potrzeb wolontariackich wszystkich organizacji.</p></div>
    </header>
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5" aria-labelledby="admin-all-needs-title">
      <h2 id="admin-all-needs-title" className="text-lg font-extrabold">Wszystkie potrzeby</h2>
      <AdminNeedsList global needs={needs.map((need) => ({
        ...need,
        startsAt: need.startsAt.toISOString(),
        endsAt: need.endsAt.toISOString(),
        signupDeadline: need.signupDeadline?.toISOString() ?? null,
        responses: need.responses.map((response) => ({ ...response, createdAt: response.createdAt.toISOString(), updatedAt: response.updatedAt.toISOString() })),
      }))} />
    </section>
  </div>;
}

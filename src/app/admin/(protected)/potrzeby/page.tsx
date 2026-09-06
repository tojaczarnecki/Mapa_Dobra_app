import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
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
    <AdminPageHeader backHref="/admin" backLabel="Panel administratora" eyebrow="Operacje wolontariackie" title="Potrzeby" description="Globalny widok potrzeb wolontariackich wszystkich organizacji." action={<div className="flex flex-wrap items-center gap-2"><Link href="/admin/moje-miejsca" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white"><Plus aria-hidden="true" size={18} />Dodaj potrzebę</Link><ClipboardList aria-hidden="true" className="mt-1 text-brand-strong" size={24} /></div>} />
    <AdminSection title="Wszystkie potrzeby" description="Aktywne, szkice i zakończone potrzeby w jednym uporządkowanym widoku." className="p-4 sm:p-5">
      <AdminNeedsList global needs={needs.map((need) => ({
        ...need,
        startsAt: need.startsAt.toISOString(),
        endsAt: need.endsAt.toISOString(),
        signupDeadline: need.signupDeadline?.toISOString() ?? null,
        responses: need.responses.map((response) => ({ ...response, createdAt: response.createdAt.toISOString(), updatedAt: response.updatedAt.toISOString() })),
      }))} />
    </AdminSection>
  </div>;
}

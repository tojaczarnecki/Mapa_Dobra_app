import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";
import { AdminNeedsList } from "@/components/admin/needs/admin-needs-list";
import { GlobalNeedLauncher } from "@/components/admin/needs/global-need-launcher";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export default async function AdminNeedsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("MANAGE_VOLUNTEER_NEEDS");
  const params = await searchParams;
  const created = params.created === "published" || params.created === "draft" ? params.created : null;
  const needs = await prisma.organizationNeed.findMany({
    include: {
      organization: { select: { name: true } },
      place: { select: { name: true, addressLine: true } },
      responses: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ status: "asc" }, { startsAt: "asc" }, { createdAt: "desc" }],
  });

  return <div className="space-y-5">
    <AdminPageHeader backHref="/admin" backLabel="Panel administratora" eyebrow="Operacje wolontariackie" title="Potrzeby" description="Globalny widok potrzeb wolontariackich wszystkich organizacji." action={<GlobalNeedLauncher />} />
    <AdminSection title="Wszystkie potrzeby" description="Aktywne, szkice i zakończone potrzeby w jednym uporządkowanym widoku." className="p-4 sm:p-5">
      {created ? <p role="status" className="border-b border-brand/20 bg-brand-soft/40 px-4 py-3 text-sm font-semibold text-brand-strong sm:px-5">{created === "published" ? "Potrzeba została opublikowana." : "Szkic potrzeby został zapisany."}</p> : null}
      <AdminNeedsList global initialView={created === "draft" ? "DRAFTS" : "ACTIVE"} needs={needs.map((need) => ({
        ...need,
        startsAt: need.startsAt.toISOString(),
        endsAt: need.endsAt.toISOString(),
        signupDeadline: need.signupDeadline?.toISOString() ?? null,
        responses: need.responses.map((response) => ({ ...response, createdAt: response.createdAt.toISOString(), updatedAt: response.updatedAt.toISOString() })),
      }))} />
    </AdminSection>
  </div>;
}

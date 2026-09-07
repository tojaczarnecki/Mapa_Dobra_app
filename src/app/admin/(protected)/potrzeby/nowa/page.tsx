import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NeedForm } from "@/components/admin/needs/need-form";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export default async function NewNeedPage() {
  await requirePermission("MANAGE_VOLUNTEER_NEEDS");
  const organizations = await prisma.organization.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      places: { select: { id: true, name: true, addressLine: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  return <div className="min-w-0 space-y-5">
    <AdminPageHeader backHref="/admin/potrzeby" backLabel="Wróć do potrzeb" eyebrow="Operacje wolontariackie" title="Nowa potrzeba" description="Utwórz ogłoszenie dla organizacji lub konkretnej placówki." />
    <main className="min-w-0 max-w-[900px]">
      <NeedForm placeId={null} globalOrganizations={organizations} />
    </main>
  </div>;
}

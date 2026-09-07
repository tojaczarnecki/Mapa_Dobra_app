import { AdminPageHeader, AdminImpactSummary } from "@/components/admin/admin-ui";
import { notFound } from "next/navigation";
import { OrganizationForm } from "@/components/admin/organizations/organization-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("MANAGE_ORGANIZATIONS");
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization) notFound();
  return (
    <div className="space-y-5">
      <AdminPageHeader backHref={`/admin/organizacje/${id}`} backLabel="Wróć do organizacji" eyebrow="Edycja organizacji" title={organization.name} description="Zmień dane organizacji i sprawdź ich publiczny wpływ." />
      <AdminImpactSummary title="Informacje publiczne"><p>Zmiany opisu i kontaktu mogą być widoczne użytkownikom Dobrej Mapy przy powiązanych miejscach.</p></AdminImpactSummary>
      <OrganizationForm initialData={{ id, name: organization.name, description: organization.description ?? "", phone: organization.phone ?? "", email: organization.email ?? "", website: organization.website ?? "", nip: organization.nip ?? "", regon: organization.regon ?? "", krs: organization.krs ?? "" }} />
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <Link href={`/admin/organizacje/${id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} /> Wróć do organizacji</Link>
      <header><p className="mb-1 text-sm font-bold text-brand-strong">Edycja organizacji</p><h1 className="text-3xl font-bold">{organization.name}</h1></header>
      <OrganizationForm initialData={{ id, name: organization.name, description: organization.description ?? "", phone: organization.phone ?? "", email: organization.email ?? "", website: organization.website ?? "", nip: organization.nip ?? "", regon: organization.regon ?? "", krs: organization.krs ?? "", legalForm: organization.legalForm ?? "" }} />
    </div>
  );
}

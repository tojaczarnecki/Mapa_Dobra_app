import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OrganizationForm } from "@/components/admin/organizations/organization-form";
import { requirePermission } from "@/lib/admin/session";

export default async function NewOrganizationPage() {
  await requirePermission("MANAGE_ORGANIZATIONS");
  return (
    <div className="space-y-5">
      <Link href="/admin/organizacje" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} /> Wróć do organizacji</Link>
      <header><p className="mb-1 text-sm font-bold text-brand-strong">Baza organizacji</p><h1 className="text-3xl font-bold">Nowa organizacja</h1><p className="mt-2 text-sm text-muted-foreground">Organizacja nie zostanie automatycznie przypisana do żadnego miejsca.</p></header>
      <OrganizationForm initialData={{ name: "", description: "", phone: "", email: "", website: "", nip: "", regon: "", krs: "", legalForm: "" }} />
    </div>
  );
}

import { AdminPageHeader, AdminImpactSummary } from "@/components/admin/admin-ui";
import { OrganizationForm } from "@/components/admin/organizations/organization-form";
import { requirePermission } from "@/lib/admin/session";

export default async function NewOrganizationPage() {
  await requirePermission("MANAGE_ORGANIZATIONS");
  return (
    <div className="space-y-5">
      <AdminPageHeader backHref="/admin/organizacje" backLabel="Wróć do organizacji" eyebrow="Baza organizacji" title="Nowa organizacja" description="Dodaj organizację, której dane będą mogły być powiązane z miejscami." />
      <AdminImpactSummary title="Informacje publiczne"><p>Dane kontaktowe i opis mogą być widoczne użytkownikom Dobrej Mapy po opublikowaniu powiązanego miejsca.</p></AdminImpactSummary>
      <OrganizationForm initialData={{ name: "", description: "", phone: "", email: "", website: "", nip: "", regon: "", krs: "" }} />
    </div>
  );
}

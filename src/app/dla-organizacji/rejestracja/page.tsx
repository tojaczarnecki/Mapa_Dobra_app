import { OrganizationRegistrationForm } from "@/components/organizations/organization-registration-form";

export const metadata = { title: "Załóż konto organizacji | Mapa Dobra" };

export default function OrganizationRegistrationPage() {
  return <main className="public-service-page mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16"><p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">Dla organizacji</p><h1 className="mt-2 text-3xl font-semibold leading-tight">Załóż konto organizacji</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Podaj dane organizacji i osoby kontaktowej. Najpierw potwierdzimy e-mail, a następnie zgłoszenie trafi do weryfikacji. Konto nie otrzyma dostępu do miejsc automatycznie.</p><OrganizationRegistrationForm /></main>;
}

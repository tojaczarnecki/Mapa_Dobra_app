import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin/session";

export default async function OrganizationPendingPage() {
  const session = await getCurrentAdmin();
  const status = session?.user.organizationRegistration?.status;
  const rejected = status === "REJECTED";
  return <main className="mx-auto max-w-xl px-4 py-12 sm:py-20"><p className="text-sm font-bold text-brand-strong">Konto organizacji</p><h1 className="mt-2 text-3xl font-bold">{rejected ? "Nie udało się potwierdzić dostępu" : "Twoje konto organizacji czeka na weryfikację"}</h1><p className="mt-4 text-base leading-7 text-muted-foreground">{rejected ? "Nie udało się potwierdzić, że reprezentujesz organizację. Skontaktuj się z Mapą Dobra, aby uzupełnić informacje." : "Po zatwierdzeniu będziemy mogli przypisać Ci placówki, którymi możesz zarządzać. Do tego czasu nie masz dostępu do panelu miejsc."}</p><Link href="/dla-organizacji/status" className="mt-7 inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 font-bold">Zobacz status zgłoszenia</Link></main>;
}

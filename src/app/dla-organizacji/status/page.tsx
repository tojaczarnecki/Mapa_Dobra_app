import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin/session";

export default async function OrganizationStatusPage() {
  const session = await getCurrentAdmin();
  return <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20"><p className="text-sm font-bold text-brand-strong">Dla organizacji</p><h1 className="mt-2 text-3xl font-bold">Zgłoszenie czeka na weryfikację</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Dziękujemy. Po zatwierdzeniu będziemy mogli przypisać Ci placówki, którymi możesz zarządzać.</p>{session?.user ? <Link href="/admin" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 font-bold">Otwórz konto</Link> : <Link href="/admin/login" className="mt-7 inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 font-bold">Zaloguj się</Link>}</main>;
}

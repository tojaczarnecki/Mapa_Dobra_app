import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenAdminPage() {
  return <div className="mx-auto max-w-xl rounded-lg border border-border bg-white p-6 text-center"><ShieldX aria-hidden="true" size={34} className="mx-auto text-urgent" /><h1 className="mt-4 text-2xl font-bold">Nie masz uprawnień do tej sekcji.</h1><p className="mt-2 text-sm text-muted-foreground">Zakres panelu wynika z Twojej roli, indywidualnych uprawnień i przypisanych placówek.</p><Link href="/admin" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold">Wróć do własnego dashboardu</Link></div>;
}

import Image from "next/image";
import Link from "next/link";
import { ResetRequestForm } from "@/components/admin/reset-request-form";

export const metadata = { title: "Resetowanie hasła | Panel administratora" };

export default function ResetRequestPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-white px-5 py-10 sm:py-16">
      <section className="w-full max-w-[460px] rounded-2xl border border-border bg-white p-5 sm:p-8">
        <Link href="/admin/login" aria-label="Wróć do logowania"><Image src="/brand/mapa-dobra-logo.svg" alt="Mapa Dobra" width={190} height={45} priority className="h-9 w-auto" /></Link>
        <p className="mb-1 mt-8 text-xs font-semibold uppercase tracking-wide text-brand-strong">Panel administratora</p>
        <h1 className="text-[1.75rem] font-semibold leading-tight text-foreground sm:text-[2rem]">Zresetuj hasło</h1>
        <p className="mb-7 mt-2 text-base leading-6 text-muted-foreground">Podaj adres e-mail używany do logowania. Jeśli konto istnieje, wyślemy instrukcję zmiany hasła.</p>
        <ResetRequestForm />
      </section>
    </main>
  );
}

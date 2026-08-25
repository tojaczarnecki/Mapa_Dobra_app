import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata = {
  title: "Logowanie administratora | Mapa Dobra",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getCurrentAdmin();
  if (session) redirect("/admin");
  const query = await searchParams;
  const next = typeof query.next === "string" && query.next.startsWith("/dla-organizacji/dostep?place=") ? query.next : "";

  return (
    <main className="flex min-h-screen items-start justify-center bg-white px-5 py-10 sm:py-16">
      <section className="w-full max-w-[460px] rounded-2xl border border-border bg-white p-5 sm:p-8">
        <Image
          src="/brand/mapa-dobra-logo.svg"
          alt="Mapa Dobra"
          width={190}
          height={45}
          priority
          className="mb-8 h-9 w-auto"
        />
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-strong">Panel administratora</p>
        <h1 className="text-[1.75rem] font-semibold leading-tight text-foreground sm:text-[2rem]">Zaloguj się</h1>
        <p className="mb-7 mt-2 text-base leading-6 text-muted-foreground">
          Dostęp wyłącznie dla upoważnionych osób moderujących zgłoszenia.
        </p>
        <LoginForm next={next} />
      </section>
    </main>
  );
}

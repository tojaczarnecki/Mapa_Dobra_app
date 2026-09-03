import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/admin/session";

export const metadata = {
  title: "Logowanie administratora | Dobra Mapa",
};

export default async function AdminLoginPage() {
  const session = await getCurrentAdmin();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-[0_18px_45px_rgb(29_29_27_/_8%)] sm:p-8">
        <Image
          src="/brand/mapa-dobra-logo-header-new.svg"
          alt="Dobra Mapa"
          width={604}
          height={120}
          priority
          className="mb-7 h-11 w-auto"
        />
        <p className="mb-1 text-sm font-bold uppercase text-brand-strong">Panel administratora</p>
        <h1 className="text-2xl font-bold">Zaloguj się</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">
          Dostęp wyłącznie dla upoważnionych osób moderujących zgłoszenia.
        </p>
        <LoginForm />
      </section>
    </div>
  );
}

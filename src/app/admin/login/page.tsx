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
    <div className="admin-login-page">
      <section className="admin-login-card">
        <Image
          src="/brand/mapa-dobra-logo-header-new.svg"
          alt="Dobra Mapa"
          width={604}
          height={120}
          priority
          className="admin-login-logo"
        />
        <div className="admin-login-heading">
          <p>PANEL ADMINISTRATORA</p>
          <h1>Zaloguj się</h1>
          <span>Dostęp dla osób moderujących dane i zgłoszenia Dobrej Mapy.</span>
        </div>
        <LoginForm />
        <p className="admin-login-note">Dostęp mają wyłącznie zaproszeni użytkownicy.</p>
      </section>
    </div>
  );
}

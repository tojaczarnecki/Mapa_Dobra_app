import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
        <WifiOff aria-hidden="true" className="mx-auto text-brand-strong" size={34} />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Brak połączenia z internetem</h1>
        <p className="mt-2 text-base font-semibold leading-7 text-muted-foreground">
          Niektóre informacje mogą być niedostępne lub nieaktualne. Połącz się z internetem i spróbuj ponownie, szczególnie przed wyjazdem do miejsca noclegowego.
        </p>
        <Link className="touch-target mt-5 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 font-extrabold text-foreground hover:bg-brand-strong hover:text-white" href="/">
          Przejdź na stronę główną
        </Link>
      </section>
    </div>
  );
}

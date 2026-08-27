import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";
import { FavoritesList } from "@/components/favorites/favorites-list";

export default function OfflinePage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7 md:pb-16 lg:px-8">
      <section className="rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
            <WifiOff aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight text-foreground">Jesteś offline</h1>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              Nie pokażemy teraz aktualnych wyników ani statusów na żywo. Nadal możesz korzystać z miejsc zapisanych wcześniej na tym urządzeniu.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4" aria-labelledby="offline-saved-title">
        <div className="mb-3">
          <h2 id="offline-saved-title" className="text-xl font-extrabold text-foreground">Zapisane miejsca</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            Te informacje mogą być nieaktualne. Gdy odzyskasz internet, sprawdź godziny i dostępność przed wyjazdem.
          </p>
        </div>
        <FavoritesList offlineMode />
      </section>

      <Link className="touch-target mt-4 inline-flex items-center gap-2 rounded-lg px-2 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft hover:text-foreground" href="/">
        <ArrowLeft aria-hidden="true" size={17} />
        Wróć do startu
      </Link>
    </div>
  );
}

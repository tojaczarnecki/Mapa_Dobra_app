import Link from "next/link";
import { WifiOff } from "lucide-react";
import { FavoritesList } from "@/components/favorites/favorites-list";

export default function OfflinePage() {
  return (
    <div className="md-offline-page">
      <section className="md-offline-intro">
        <WifiOff aria-hidden="true" size={28} />
        <div>
          <h1>Jesteś offline</h1>
          <p>Nie pokażemy teraz aktualnych wyników ani statusów na żywo. Nadal możesz korzystać z miejsc zapisanych wcześniej na tym urządzeniu.</p>
        </div>
      </section>

      <section className="md-offline-saved" aria-labelledby="offline-saved-title">
        <div className="md-page-heading">
          <h2 id="offline-saved-title">Zapisane miejsca</h2>
          <p>Te informacje mogą być nieaktualne. Gdy odzyskasz internet, sprawdź godziny i dostępność przed wyjazdem.</p>
        </div>
        <FavoritesList offlineMode />
      </section>

      <Link className="md-help-cta md-offline-home-link" href="/">
        Wróć do startu
      </Link>
    </div>
  );
}

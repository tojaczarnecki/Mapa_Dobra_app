import Link from "next/link";
import { WifiOff } from "lucide-react";
import { OfflineRetry } from "@/components/app/offline-retry";

export default function OfflinePage() {
  return (
    <div className="public-state-page">
      <section className="public-state-content">
        <WifiOff aria-hidden="true" className="public-state-icon" size={34} />
        <h1>Brak połączenia z internetem</h1>
        <p>
          Możesz przeglądać zapisane miejsca i dane z ostatniej wizyty. Nowe wyszukiwanie oraz aktualne informacje wymagają połączenia.
        </p>
        <div className="public-state-actions">
          <Link className="public-state-primary" href="/zapisane">Zobacz zapisane miejsca</Link>
          <Link className="public-state-secondary" href="/">Przejdź na stronę główną</Link>
          <OfflineRetry />
        </div>
      </section>
    </div>
  );
}

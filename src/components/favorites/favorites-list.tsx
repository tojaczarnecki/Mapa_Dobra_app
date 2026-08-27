"use client";

import Link from "next/link";
import { ChevronRight, Clock3, Heart, MapPin, Phone, Search, Trash2, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FAVORITES_CHANGED_EVENT,
  readFavorites,
  removeFavorite,
  type FavoritePlace,
} from "@/lib/favorites/storage";

export type FavoriteLivePlace = {
  id: string;
  href: string;
  name: string;
  categoryLabel: string;
  status: "open" | "closed" | "openToday" | "unknownHours" | "needsConfirmation";
  todayHours: string;
  distanceLabel: string;
  address: string;
  phone?: string;
};

function statusLabel(status: FavoriteLivePlace["status"]) {
  if (status === "open") return "OTWARTE TERAZ";
  if (status === "openToday") return "OTWARTE DZISIAJ";
  if (status === "closed") return "ZAMKNIĘTE TERAZ";
  if (status === "needsConfirmation") return "DANE WYMAGAJĄ POTWIERDZENIA";
  return "BRAK POTWIERDZONYCH GODZIN";
}

function statusTone(status: FavoriteLivePlace["status"]): FavoritePlace["statusTone"] {
  if (status === "open") return "open";
  if (status === "openToday") return "openToday";
  if (status === "closed") return "closed";
  return "unknown";
}

function statusClass(place: FavoritePlace) {
  if (place.statusTone === "open" || place.statusTone === "openToday") return "is-open";
  if (place.statusTone === "closed") return "is-closed";
  return "is-warning";
}

export function FavoritesList({
  offlineMode = false,
  livePlaces = [],
}: {
  offlineMode?: boolean;
  livePlaces?: FavoriteLivePlace[];
}) {
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setFavorites(readFavorites());
      setReady(true);
    };
    update();
    window.addEventListener(FAVORITES_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const displayedFavorites = useMemo(() => {
    if (offlineMode || livePlaces.length === 0) return favorites;
    const byId = new Map(livePlaces.map((place) => [place.id, place]));
    return favorites.map((saved) => {
      const live = byId.get(saved.id);
      if (!live) return saved;
      return {
        ...saved,
        href: live.href,
        name: live.name,
        categoryLabel: live.categoryLabel,
        statusLabel: statusLabel(live.status),
        statusTone: statusTone(live.status),
        todayHours: live.todayHours,
        distanceLabel: live.distanceLabel,
        address: live.address,
        phone: live.phone,
      };
    });
  }, [favorites, livePlaces, offlineMode]);

  if (!ready) {
    return <div className="md-favorites-loading" role="status">Wczytywanie zapisanych miejsc…</div>;
  }

  if (displayedFavorites.length === 0) {
    return (
      <div className="md-empty-card">
        <Heart aria-hidden="true" size={28} />
        <strong>Nie masz jeszcze zapisanych miejsc</strong>
        <p>Zapisane miejsca są przechowywane na tym urządzeniu i nie wymagają konta.</p>
        {!offlineMode ? (
          <Link className="md-help-cta" href="/szukaj" style={{ marginTop: 16 }}>
            <Search aria-hidden="true" size={17} />
            Znajdź pomoc
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="md-favorites-list">
      {offlineMode ? (
        <div className="md-offline-saved-note" role="note">
          <WifiOff aria-hidden="true" size={18} />
          <span>Pokazujemy ostatnio zapisane informacje. Przed wyjazdem warto potwierdzić je po odzyskaniu internetu.</span>
        </div>
      ) : (
        <div className="md-live-saved-note" role="note">
          Godziny i statusy zostały odświeżone z aktualnych danych Mapy Dobra.
        </div>
      )}
      {displayedFavorites.map((place) => (
        <article key={place.id} className="md-favorite-row">
          <Link href={place.href} className="md-favorite-row-main">
            <div className="md-favorite-row-heading">
              <div>
                <h2>{place.name}</h2>
                <p>{place.categoryLabel}</p>
              </div>
              <ChevronRight aria-hidden="true" size={20} />
            </div>
            <div className={`md-favorite-status ${statusClass(place)}`}>
              <span className="md-status-dot" aria-hidden="true" />
              <span>{place.statusLabel}</span>
            </div>
            <p className="md-favorite-meta"><Clock3 aria-hidden="true" size={15} />{place.todayHours}</p>
            <p className="md-favorite-meta"><MapPin aria-hidden="true" size={15} />{place.address}</p>
          </Link>
          <div className="md-favorite-row-actions">
            {place.phone ? (
              <a href={`tel:${place.phone.replace(/[^+\d]/gu, "")}`} className="md-favorite-mini-action">
                <Phone aria-hidden="true" size={16} />
                Zadzwoń
              </a>
            ) : null}
            <button
              type="button"
              className="md-favorite-mini-action"
              onClick={() => removeFavorite(place.id)}
              aria-label={`Usuń ${place.name} z ulubionych`}
            >
              <Trash2 aria-hidden="true" size={16} />
              Usuń
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

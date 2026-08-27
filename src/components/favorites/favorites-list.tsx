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

function statusClasses(place: FavoritePlace) {
  if (place.statusTone === "open" || place.statusTone === "openToday") {
    return {
      pill: "border-brand bg-brand-soft text-foreground",
      dot: "bg-brand-strong",
    };
  }
  if (place.statusTone === "closed") {
    return {
      pill: "border-border bg-surface-muted text-foreground",
      dot: "bg-muted-foreground",
    };
  }
  return {
    pill: "border-urgent-border bg-urgent-soft text-foreground",
    dot: "bg-urgent",
  };
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
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm font-semibold text-muted-foreground" role="status">
        Wczytywanie zapisanych miejsc…
      </div>
    );
  }

  if (displayedFavorites.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
          <Heart aria-hidden="true" size={24} />
        </span>
        <strong className="mt-3 block text-lg font-extrabold text-foreground">Nie masz jeszcze zapisanych miejsc</strong>
        <p className="mx-auto mt-1 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
          Zapisane miejsca są przechowywane tylko na tym urządzeniu i nie wymagają konta.
        </p>
        {!offlineMode ? (
          <Link className="touch-target mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-strong hover:text-white" href="/szukaj">
            <Search aria-hidden="true" size={17} />
            Znajdź pomoc
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      {offlineMode ? (
        <div className="flex items-start gap-2 rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2 text-sm font-semibold leading-5 text-muted-foreground" role="note">
          <WifiOff aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-urgent" />
          <span>Pokazujemy ostatnio zapisane informacje. Po odzyskaniu internetu sprawdź godziny i dostępność przed wyjazdem.</span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm font-semibold leading-5 text-muted-foreground" role="note">
          Godziny i statusy zostały odświeżone z aktualnych danych Mapy Dobra.
        </div>
      )}

      {displayedFavorites.map((place) => {
        const tone = statusClasses(place);
        return (
          <article key={place.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_10px_26px_rgb(17_24_39_/_6%)]">
            <Link href={place.href} className="block min-w-0 p-4 transition hover:bg-surface-muted/70">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold leading-tight text-foreground">{place.name}</h2>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">{place.categoryLabel}</p>
                </div>
                <ChevronRight aria-hidden="true" size={20} className="mt-1 shrink-0 text-muted-foreground" />
              </div>

              <div className={["mt-3 inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 text-xs font-extrabold", tone.pill].join(" ")}>
                <span className={["h-2 w-2 shrink-0 rounded-full", tone.dot].join(" ")} aria-hidden="true" />
                <span>{place.statusLabel}</span>
              </div>

              <div className="mt-3 grid min-w-0 gap-1.5 text-sm font-semibold text-muted-foreground">
                <p className="flex min-w-0 items-start gap-2"><Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-strong" /><span>{place.todayHours}</span></p>
                <p className="flex min-w-0 items-start gap-2"><MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-strong" /><span>{place.address}</span></p>
              </div>
            </Link>

            <div className="grid grid-cols-2 border-t border-border">
              {place.phone ? (
                <a href={`tel:${place.phone.replace(/[^+\d]/gu, "")}`} className="touch-target inline-flex items-center justify-center gap-2 border-r border-border px-3 py-2 text-sm font-extrabold text-brand-strong transition hover:bg-brand-soft">
                  <Phone aria-hidden="true" size={16} />
                  Zadzwoń
                </a>
              ) : (
                <span className="touch-target inline-flex items-center justify-center gap-2 border-r border-border px-3 py-2 text-sm font-extrabold text-muted-foreground opacity-60" aria-disabled="true">
                  <Phone aria-hidden="true" size={16} />
                  Brak telefonu
                </span>
              )}
              <button
                type="button"
                className="touch-target inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                onClick={() => removeFavorite(place.id)}
                aria-label={`Usuń ${place.name} z ulubionych`}
              >
                <Trash2 aria-hidden="true" size={16} />
                Usuń
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlaceDetail } from "@/data/demo-place-details";
import {
  FAVORITES_CHANGED_EVENT,
  isFavorite,
  toggleFavorite,
} from "@/lib/favorites/storage";

type FavoritePlaceButtonProps = {
  place: PlaceDetail;
};

export function FavoritePlaceButton({ place }: FavoritePlaceButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const update = () => setSaved(isFavorite(place.id));
    update();
    window.addEventListener(FAVORITES_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [place.id]);

  const onToggle = () => {
    const next = toggleFavorite({
      id: place.id,
      href: `/lodz/${place.categorySlug}/${place.slug}`,
      name: place.name,
      categoryLabel: place.helpTypes[0] ?? place.typeLabel,
      statusLabel: place.status.label,
      statusTone: place.status.tone,
      todayHours: place.status.todayHours,
      distanceLabel: place.distanceLabel,
      address: place.address,
      phone: place.contact.phone,
    });
    setSaved(next);
  };

  return (
    <button
      type="button"
      className={[
        "touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition",
        saved
          ? "border-brand bg-brand-soft text-brand-strong"
          : "border-border bg-surface text-muted-foreground hover:border-brand hover:bg-brand-soft hover:text-brand-strong",
      ].join(" ")}
      aria-pressed={saved}
      aria-label={saved ? "Usuń z ulubionych" : "Zapisz w ulubionych"}
      title={saved ? "Usuń z ulubionych" : "Zapisz w ulubionych"}
      onClick={onToggle}
    >
      <Heart aria-hidden="true" size={21} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isPlaceSaved, removeSavedPlace, savePlace, subscribeToSavedPlaces, type SavedPlace } from "@/lib/saved-places";

export function SavedPlaceButton({ place, compact = false }: { place: Omit<SavedPlace, "savedAt">; compact?: boolean }) {
  const saved = useSyncExternalStore(
    subscribeToSavedPlaces,
    () => isPlaceSaved(place.id),
    () => false,
  );
  const [feedback, setFeedback] = useState("");
  const feedbackTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  const label = saved ? "Usuń z zapisanych" : "Zapisz miejsce";
  return (
    <button
      type="button"
      className={compact ? "saved-place-button saved-place-button-compact" : "saved-place-button"}
      aria-label={label}
      aria-pressed={saved}
      title={label}
      onClick={() => {
        if (saved) {
          removeSavedPlace(place.id);
          setFeedback("Usunięto z zapisanych");
        } else {
          savePlace(place);
          setFeedback("Miejsce zapisane");
          window.dispatchEvent(new Event("mapa-dobra:saved-place"));
        }
        feedbackTimer.current = window.setTimeout(() => setFeedback(""), 2200);
      }}
    >
      <Bookmark aria-hidden="true" fill={saved ? "currentColor" : "none"} size={compact ? 22 : 22} />
      {!compact ? <span className="sr-only">{label}</span> : null}
      {feedback ? <span className="sr-only" role="status" aria-live="polite">{feedback}</span> : null}
    </button>
  );
}

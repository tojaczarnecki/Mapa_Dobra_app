"use client";

import Link from "next/link";
import { MapPin, Navigation, Phone, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useEffect, useState } from "react";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { readSavedPlaces, removeSavedPlace, subscribeToSavedPlaces } from "@/lib/saved-places";
import { SavedPlaceDetail } from "./saved-place-detail";

export function SavedPlacesPage() {
  const places = useSyncExternalStore(subscribeToSavedPlaces, readSavedPlaces, () => []);
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    const updateSelected = () => setSelectedId(window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : undefined);
    updateSelected();
    window.addEventListener("hashchange", updateSelected);
    return () => window.removeEventListener("hashchange", updateSelected);
  }, []);

  if (selectedId) return <SavedPlaceDetail id={selectedId} />;

  return (
    <div className="public-page-shell saved-places-page">
      <section className="public-page-heading">
        <p className="public-page-eyebrow">Na tym urządzeniu</p>
        <h1>Zapisane miejsca</h1>
        <p>Miejsca, do których chcesz szybko wrócić.</p>
      </section>
      {places.length === 0 ? (
        <section className="public-state-content saved-places-empty">
          <h2>Nie masz jeszcze zapisanych miejsc.</h2>
          <p>Zapisz miejsce, aby szybko wrócić do niego później — także przy ograniczonym dostępie do internetu.</p>
          <Link className="public-state-primary" href="/szukaj">Znajdź miejsce</Link>
        </section>
      ) : (
        <div className="saved-places-list">
          {places.map((place) => {
            const callHref = telephoneHref(place.phone);
            const routeHref = place.latitude !== undefined && place.longitude !== undefined
              ? directionsHref({ latitude: place.latitude, longitude: place.longitude, address: place.address })
              : directionsHref({ address: place.address });
            return (
              <article className="place-card saved-place-card" key={place.id}>
                <div className="saved-place-card-heading">
                  <div className="min-w-0">
                    <p className="place-card-category">{place.category}</p>
                    <h2><Link href={place.detailHref}>{place.name}</Link></h2>
                  </div>
                  <button type="button" className="saved-place-remove" onClick={() => removeSavedPlace(place.id)} aria-label={`Usuń ${place.name} z zapisanych`} title="Usuń z zapisanych">
                    <Trash2 aria-hidden="true" size={18} />
                  </button>
                </div>
                <p className="saved-place-line"><MapPin aria-hidden="true" size={16} />{place.address}</p>
                <p className="saved-place-line"><span className="saved-place-status">{place.status}</span>{place.hours}</p>
                <p className="saved-place-freshness">Godziny z momentu zapisania. Przed wyjściem sprawdź aktualność danych.</p>
                {place.category === "Nocleg" ? <p className="saved-place-warning">Dostępność noclegu może być nieaktualna. Zadzwoń przed przyjazdem.</p> : null}
                <div className="place-card-actions">
                  {callHref ? <a className="place-card-action place-card-action-secondary" href={callHref}><Phone aria-hidden="true" size={16} />Zadzwoń</a> : null}
                  {routeHref ? <a className="place-card-action place-card-action-secondary" href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={16} />Trasa</a> : null}
                  <Link className="place-card-action place-card-action-secondary" href={`/zapisane#${encodeURIComponent(place.id)}`}>Szczegóły</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

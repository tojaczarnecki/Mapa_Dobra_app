"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Phone, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { readSavedPlaces, removeSavedPlace, subscribeToSavedPlaces } from "@/lib/saved-places";

export function SavedPlaceDetail({ id }: { id: string }) {
  const places = useSyncExternalStore(subscribeToSavedPlaces, readSavedPlaces, () => []);
  const place = places.find((item) => item.id === id);

  if (!place) {
    return (
      <div className="public-state-page">
        <section className="public-state-content">
          <h1>Nie znaleźliśmy zapisanego miejsca.</h1>
          <p>To miejsce mogło zostać usunięte z pamięci tego urządzenia.</p>
          <Link className="public-state-primary" href="/zapisane">Wróć do zapisanych miejsc</Link>
        </section>
      </div>
    );
  }

  const callHref = telephoneHref(place.phone);
  const routeHref = directionsHref({ latitude: place.latitude, longitude: place.longitude, address: place.address });

  return (
    <div className="public-page-shell saved-place-detail-page">
      <Link className="saved-place-detail-back" href="/zapisane"><ArrowLeft aria-hidden="true" size={17} />Zapisane miejsca</Link>
      <article className="saved-place-detail">
        <p className="public-page-eyebrow">Ostatnio zapisane dane</p>
        <p className="place-card-category">{place.category}</p>
        <h1>{place.name}</h1>
        <p className="saved-place-line"><MapPin aria-hidden="true" size={17} />{place.address}</p>
        <p className="saved-place-line"><span className="saved-place-status">{place.status}</span>{place.hours}</p>
        <p className="saved-place-freshness">Dane zapisane {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(place.savedAt))}. Godziny i dostępność mogą być nieaktualne.</p>
        {place.category === "Nocleg" ? <p className="saved-place-warning">Ostatnio zapisana dostępność noclegu nie jest gwarancją miejsca. Zadzwoń przed przyjazdem.</p> : null}
        <div className="saved-place-detail-actions">
          {callHref ? <a className="place-card-action place-card-action-primary" href={callHref}><Phone aria-hidden="true" size={17} />Zadzwoń</a> : null}
          {routeHref ? <a className="place-card-action place-card-action-secondary" href={routeHref} target="_blank" rel="noreferrer"><Navigation aria-hidden="true" size={17} />Trasa</a> : null}
          <button type="button" className="place-card-action place-card-action-secondary" onClick={() => removeSavedPlace(place.id)}><Trash2 aria-hidden="true" size={17} />Usuń</button>
        </div>
      </article>
    </div>
  );
}

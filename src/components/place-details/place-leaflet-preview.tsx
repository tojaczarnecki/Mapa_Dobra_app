"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { useEffect, useState } from "react";

export function PlaceLeafletPreview({ position, address }: { position: readonly [number, number]; address: string }) {
  const [unavailable, setUnavailable] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setUnavailable(true);
    const handleOnline = () => setUnavailable(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (unavailable) {
    return <div className="place-detail-map-unavailable" role="status"><p>Mapa jest obecnie niedostępna.</p></div>;
  }

  return (
    <div className="place-detail-map-canvas" aria-label={`Mapa lokalizacji: ${address}`}>
      <MapContainer
        center={[position[0], position[1]]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl
        className="place-detail-leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setUnavailable(true) }}
        />
        <CircleMarker
          center={[position[0], position[1]]}
          radius={10}
          pathOptions={{ color: "#18364d", fillColor: "#13ad87", fillOpacity: 1, weight: 3 }}
        />
      </MapContainer>
    </div>
  );
}

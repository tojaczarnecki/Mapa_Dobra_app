"use client";

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import type { GeographicContext } from "@/lib/geocoding/geographic-context";
import type { GeocodingPrecision } from "@/lib/geocoding/results";

function LocationEvents({ onPick, position, zoom }: { onPick: (position: [number, number]) => void; position?: readonly [number, number]; zoom: number }) {
  const map = useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  useEffect(() => {
    map.invalidateSize();
    if (position) map.setView([position[0], position[1]], zoom);
  }, [map, position, zoom]);
  return null;
}

export function HelpRequestLocationMap({
  position,
  onPick,
  geographicContext,
  precision,
}: {
  position?: readonly [number, number];
  onPick: (position: [number, number]) => void;
  geographicContext?: GeographicContext;
  precision?: GeocodingPrecision;
}) {
  const defaultCenter: [number, number] = geographicContext?.center
    ? [geographicContext.center.lat, geographicContext.center.lng]
    : [0, 0];
  const zoom = position
    ? precision === "address" ? 17 : precision === "street" ? 15 : precision === "area" ? 13 : 16
    : 12;
  return (
    <div className="help-request-location-map overflow-hidden rounded-lg border border-[#d7a548]/60">
      <MapContainer
        center={position ? [position[0], position[1]] : defaultCenter}
        zoom={zoom}
        className="h-56 w-full"
        scrollWheelZoom
        aria-label="Mapa do wskazania przybliżonej lokalizacji"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationEvents onPick={onPick} position={position} zoom={zoom} />
        {position ? <CircleMarker center={[position[0], position[1]]} radius={10} pathOptions={{ color: "#b7791f", fillColor: "#e6a93b", fillOpacity: 0.9 }} /> : null}
      </MapContainer>
    </div>
  );
}

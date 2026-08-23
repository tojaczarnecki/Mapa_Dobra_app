"use client";

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect } from "react";

const lodzCenter: [number, number] = [51.7592, 19.456];

function LocationEvents({ onPick }: { onPick: (position: [number, number]) => void }) {
  const map = useMapEvents({
    click(event) {
      onPick([event.latlng.lat, event.latlng.lng]);
    },
  });
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export function HelpRequestLocationMap({
  position,
  onPick,
}: {
  position?: readonly [number, number];
  onPick: (position: [number, number]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d7a548]/60">
      <MapContainer
        center={position ? [position[0], position[1]] : lodzCenter}
        zoom={position ? 16 : 12}
        className="h-56 w-full"
        scrollWheelZoom
        aria-label="Mapa do wskazania przybliżonej lokalizacji"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationEvents onPick={onPick} />
        {position ? <CircleMarker center={[position[0], position[1]]} radius={10} pathOptions={{ color: "#b7791f", fillColor: "#e6a93b", fillOpacity: 0.9 }} /> : null}
      </MapContainer>
    </div>
  );
}

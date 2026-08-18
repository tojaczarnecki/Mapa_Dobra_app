"use client";

import { divIcon, type LeafletMouseEvent, type Marker as LeafletMarker } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const lodzCenter: [number, number] = [51.7592, 19.455];

function MapBridge({ position, onChange }: { position: [number, number] | null; onChange: (position: [number, number]) => void }) {
  const map = useMapEvents({ click: (event: LeafletMouseEvent) => onChange([event.latlng.lat, event.latlng.lng]) });
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16));
  }, [map, position]);
  return null;
}

export default function LocationMap({ position, onChange }: { position: [number, number] | null; onChange: (position: [number, number]) => void }) {
  const markerIcon = useMemo(() => divIcon({
    className: "border-0 bg-transparent",
    html: '<span style="display:flex;width:36px;height:36px;align-items:center;justify-content:center;border:3px solid #08765f;border-radius:50% 50% 50% 0;background:#fff;color:#1d1d1b;box-shadow:0 5px 14px rgb(17 24 39 / 24%);transform:rotate(-45deg)"><span style="width:8px;height:8px;border-radius:50%;background:#13ad87"></span></span>',
    iconAnchor: [18, 34],
    iconSize: [36, 36],
  }), []);
  return (
    <MapContainer center={position ?? lodzCenter} zoom={position ? 16 : 12} className="h-[300px] w-full rounded-lg" zoomControl aria-label="Mapa do ręcznego ustawienia lokalizacji">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapBridge position={position} onChange={onChange} />
      {position ? <Marker
        position={position}
        icon={markerIcon}
        draggable
        eventHandlers={{ dragend: (event) => {
          const marker = event.target as LeafletMarker;
          const point = marker.getLatLng();
          onChange([point.lat, point.lng]);
        } }}
      /> : null}
    </MapContainer>
  );
}

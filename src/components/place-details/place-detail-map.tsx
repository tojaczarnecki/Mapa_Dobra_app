"use client";

import { divIcon } from "leaflet";
import { MapPin } from "lucide-react";
import { createElement, useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

type PlaceDetailMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

function MapResizeSync() {
  const map = useMap();
  const frames = useRef<number[]>([]);

  useEffect(() => {
    const refresh = () => {
      frames.current.forEach((frame) => window.cancelAnimationFrame(frame));
      const first = window.requestAnimationFrame(() => {
        const second = window.requestAnimationFrame(() => map.invalidateSize({ animate: false, pan: false }));
        frames.current.push(second);
      });
      frames.current.push(first);
    };
    const container = map.getContainer();
    const parent = container.parentElement;
    const grandparent = parent?.parentElement;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refresh);
    observer?.observe(container);
    if (parent) observer?.observe(parent);
    if (grandparent) observer?.observe(grandparent);
    window.addEventListener("resize", refresh);
    container.addEventListener("transitionend", refresh);
    parent?.addEventListener("transitionend", refresh);
    grandparent?.addEventListener("transitionend", refresh);
    refresh();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", refresh);
      container.removeEventListener("transitionend", refresh);
      parent?.removeEventListener("transitionend", refresh);
      grandparent?.removeEventListener("transitionend", refresh);
      frames.current.forEach((frame) => window.cancelAnimationFrame(frame));
      frames.current = [];
    };
  }, [map]);

  return null;
}

export function PlaceDetailMap({ latitude, longitude, label }: PlaceDetailMapProps) {
  const icon = useMemo(() => divIcon({
    className: "place-detail-marker-host",
    html: `<span class="place-detail-marker" aria-hidden="true">${renderToStaticMarkup(createElement(MapPin, { size: 28, strokeWidth: 2.4 }))}</span>`,
    iconAnchor: [18, 36],
    iconSize: [36, 36],
  }), []);

  return (
    <div className="h-56 min-w-0 overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        zoomControl
        className="h-full w-full"
        aria-label={`Mapa dojazdu do miejsca: ${label}`}
      >
        <MapResizeSync />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={icon} title={label} alt={label} />
      </MapContainer>
    </div>
  );
}

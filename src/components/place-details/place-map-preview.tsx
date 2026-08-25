"use client";

import dynamic from "next/dynamic";

const PlaceLeafletPreview = dynamic(
  () => import("./place-leaflet-preview").then((module) => module.PlaceLeafletPreview),
  { ssr: false, loading: () => <div className="place-detail-map-unavailable" role="status"><p>Ładowanie mapy…</p></div> },
);

export function PlaceMapPreview({ position, address }: { position: readonly [number, number]; address: string }) {
  return <PlaceLeafletPreview position={position} address={address} />;
}

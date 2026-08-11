"use client";

import { divIcon } from "leaflet";
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import styles from "./map.module.css";

export function UserLocationMarker({
  position,
}: {
  position: readonly [number, number];
}) {
  const icon = useMemo(
    () =>
      divIcon({
        className: styles.userMarkerHost,
        html: `<span class="${styles.userMarker}" aria-hidden="true"><span></span></span>`,
        iconAnchor: [12, 12],
        iconSize: [24, 24],
      }),
    [],
  );

  return (
    <Marker
      position={[position[0], position[1]]}
      icon={icon}
      title="Twoja lokalizacja"
      alt="Twoja lokalizacja"
      zIndexOffset={2000}
    />
  );
}

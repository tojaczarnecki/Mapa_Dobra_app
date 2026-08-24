"use client";

import { divIcon } from "leaflet";
import { createElement, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import type { MapPlace } from "@/data/demo-map-places";
import { getCategoryAccentMap } from "@/lib/home/category-accent";
import { getCategoryIcon } from "@/lib/home/category-visuals";
import styles from "./map.module.css";

export function MapMarker({
  place,
  selected,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: (place: MapPlace) => void;
}) {
  const categorySlug = place.categories[0] ?? "food";
  const CategoryIcon = getCategoryIcon(categorySlug);
  const accent = getCategoryAccentMap([categorySlug]).get(categorySlug);
  const categoryIconMarkup = useMemo(
    () =>
      renderToStaticMarkup(
        createElement(CategoryIcon, {
          "aria-hidden": true,
          focusable: false,
          size: 20,
          strokeWidth: 2.2,
        }),
      ),
    [CategoryIcon],
  );
  const icon = useMemo(
    () =>
      divIcon({
        className: styles.markerHost,
        html: `<span class="${styles.mapMarker} ${selected ? styles.mapMarkerSelected : ""}" style="--category-accent:${accent}" aria-hidden="true"><span>${categoryIconMarkup}</span></span>`,
        iconAnchor: [22, 42],
        iconSize: [44, 44],
      }),
    [accent, categoryIconMarkup, selected],
  );

  return (
    <Marker
      position={[place.latitude, place.longitude]}
      icon={icon}
      title={`${place.name}. ${place.helpTypes.join(", ")}`}
      alt={`Miejsce pomocy: ${place.name}`}
      riseOnHover
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(place) }}
    />
  );
}

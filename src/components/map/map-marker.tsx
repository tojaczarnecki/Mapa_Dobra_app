"use client";

import { divIcon } from "leaflet";
import {
  BedDouble,
  Brain,
  CircleEllipsis,
  Droplets,
  HeartPulse,
  HandHeart,
  Scale,
  Shirt,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { createElement, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker } from "react-leaflet";
import type { MapCategory, MapPlace } from "@/data/demo-map-places";
import styles from "./map.module.css";

const categoryIcon: Record<MapCategory, LucideIcon> = {
  food: Utensils,
  accommodation: BedDouble,
  hygiene: Droplets,
  medical: HeartPulse,
  legal: Scale,
  psychological: Brain,
  social: HandHeart,
  clothing: Shirt,
  other: CircleEllipsis,
};

export function MapMarker({
  place,
  selected,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: (place: MapPlace) => void;
}) {
  const CategoryIcon = categoryIcon[place.categories[0]] ?? CircleEllipsis;
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
        html: `<span class="${styles.mapMarker} ${selected ? styles.mapMarkerSelected : ""}" aria-hidden="true"><span>${categoryIconMarkup}</span></span>`,
        iconAnchor: [22, 22],
        iconSize: [44, 44],
      }),
    [categoryIconMarkup, selected],
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

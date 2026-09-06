"use client";

import { divIcon, type Marker as LeafletMarker } from "leaflet";
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
import { createElement, useEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Marker, Popup } from "react-leaflet";
import type { MapCategory, MapPlace } from "@/data/demo-map-places";
import { MapPlacePopup } from "./map-place-popup";
import styles from "./map.module.css";
import { categoryIllustrationColor, categoryIllustrationPath, placeIllustrationSlug } from "@/lib/categories/category-illustrations";

function markerStatusLabel(place: MapPlace) {
  if (place.profileKind === "FOOD_SHARING") return "dostęp 24/7, zawartość zależna od darów";
  if (place.status.kind === "standard") {
    switch (place.status.status) {
      case "open":
        return "otwarte teraz";
      case "openToday":
        return "otwarte później dzisiaj";
      case "closed":
        return "zamknięte";
      default:
        return "brak potwierdzonych informacji o dostępności";
    }
  }

  return place.status.availabilityState === "available"
    ? "dostępność potwierdzona"
    : "brak potwierdzonych informacji o dostępności";
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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

const categoryIllustrationSlug: Partial<Record<MapCategory, string>> = {
  food: "jedzenie",
  accommodation: "nocleg",
  hygiene: "higiena",
  medical: "pomoc-medyczna",
  legal: "pomoc-prawna",
  social: "pomoc-socjalna",
  clothing: "odziez",
  other: "wiecej",
};

export function MapMarker({
  place,
  selected,
  onSelect,
  onClose,
  returnTo,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: (place: MapPlace) => void;
  onClose?: () => void;
  returnTo?: string;
}) {
  const CategoryIcon = categoryIcon[place.categories[0]] ?? CircleEllipsis;
  const illustrationSlug = placeIllustrationSlug(place.profileKind, categoryIllustrationSlug[place.categories[0]]);
  const categoryIllustration = categoryIllustrationPath(illustrationSlug);
  const categoryIllustrationColorValue = categoryIllustrationColor(illustrationSlug);
  const markerRef = useRef<LeafletMarker>(null);
  const categoryIconMarkup = useMemo(() => categoryIllustration
    ? categoryIllustration.endsWith(".svg")
      ? `<svg class="${styles.mapMarkerIllustration}" viewBox="0 0 1254 1254" aria-hidden="true" focusable="false" style="color:${escapeAttribute(categoryIllustrationColorValue ?? "currentColor")};fill:currentColor"><use href="${categoryIllustration}#Warstwa_1"></use></svg>`
      : `<img class="${styles.mapMarkerIllustration}" src="${categoryIllustration}" alt="" aria-hidden="true" />`
    : renderToStaticMarkup(createElement(CategoryIcon, { "aria-hidden": true, focusable: false, size: 20, strokeWidth: 2.2 })), [CategoryIcon, categoryIllustration, categoryIllustrationColorValue]);
  const icon = useMemo(
    () =>
      divIcon({
        className: styles.markerHost,
        html: `<span class="${styles.mapMarker} ${selected ? styles.mapMarkerSelected : ""}" role="img" aria-label="${escapeAttribute(`Miejsce pomocy: ${place.name}. ${markerStatusLabel(place)}`)}"><span aria-hidden="true">${categoryIconMarkup}</span></span>`,
        iconAnchor: [22, 22],
        iconSize: [44, 44],
      }),
    [categoryIconMarkup, place, selected],
  );

  useEffect(() => {
    if (selected) markerRef.current?.openPopup();
  }, [selected]);

  return (
    <Marker
      ref={markerRef}
      position={[place.latitude, place.longitude]}
      icon={icon}
      title={`${place.name}. ${place.helpTypes.join(", ")}`}
      alt={`Miejsce pomocy: ${place.name}`}
      riseOnHover
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect(place),
        popupclose: onClose,
      }}
    >
      <Popup
        autoPan
        autoPanPadding={[24, 80]}
        closeButton
        maxWidth={260}
        minWidth={220}
      >
        <MapPlacePopup place={place} returnTo={returnTo} />
      </Popup>
    </Marker>
  );
}

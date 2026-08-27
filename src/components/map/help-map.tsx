"use client";

import { divIcon, type LatLngBounds, type MarkerCluster } from "leaflet";
import { useCallback, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { MapPlace } from "@/data/demo-map-places";
import { lodzMapCenter } from "@/data/demo-map-places";
import { MapMarker } from "./map-marker";
import type { MapViewportSnapshot } from "./map-viewport-types";
import { UserLocationMarker } from "./user-location-marker";
import styles from "./map.module.css";

export type MapFocusTarget = {
  coordinates: readonly [number, number];
  zoom: number;
  requestId: number;
};

type HelpMapProps = {
  places: MapPlace[];
  selectedPlaceId?: string;
  userPosition?: readonly [number, number];
  focusTarget?: MapFocusTarget;
  onPlaceSelect: (place: MapPlace) => void;
  onViewportChange: (snapshot: MapViewportSnapshot) => void;
  onTileError: () => void;
};

function createClusterIcon(cluster: MarkerCluster) {
  return divIcon({
    className: styles.clusterHost,
    html: `<span class="${styles.clusterMarker}" aria-hidden="true">${cluster.getChildCount()}</span>`,
    iconAnchor: [24, 24],
    iconSize: [48, 48],
  });
}

function placeIdsWithinBounds(places: MapPlace[], bounds: LatLngBounds) {
  return places
    .filter((place) => bounds.contains([place.latitude, place.longitude]))
    .map((place) => place.id);
}

function MapViewportBridge({
  places,
  focusTarget,
  onViewportChange,
}: Pick<HelpMapProps, "places" | "focusTarget" | "onViewportChange">) {
  const programmaticMoveRef = useRef(false);
  const userMoveRef = useRef(false);

  const reportViewport = useCallback(
    (map: ReturnType<typeof useMap>, reason: MapViewportSnapshot["reason"]) => {
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();
      onViewportChange({
        bounds: [
          [southWest.lat, southWest.lng],
          [northEast.lat, northEast.lng],
        ],
        visiblePlaceIds: placeIdsWithinBounds(places, bounds),
        reason,
      });
    },
    [onViewportChange, places],
  );

  const map = useMapEvents({
    movestart: () => {
      if (!programmaticMoveRef.current) userMoveRef.current = true;
    },
    moveend: () => {
      const reason = programmaticMoveRef.current
        ? "focus"
        : userMoveRef.current
          ? "user"
          : "initial";
      reportViewport(map, reason);
      programmaticMoveRef.current = false;
      userMoveRef.current = false;
    },
  });

  useEffect(() => {
    reportViewport(map, "initial");
  }, [map, reportViewport]);

  useEffect(() => {
    if (!focusTarget) return;

    const coordinates: [number, number] = [
      focusTarget.coordinates[0],
      focusTarget.coordinates[1],
    ];
    const alreadyFocused =
      map.getZoom() === focusTarget.zoom && map.getCenter().distanceTo(coordinates) < 1;

    if (alreadyFocused) {
      reportViewport(map, "focus");
      return;
    }

    programmaticMoveRef.current = true;
    userMoveRef.current = false;
    map.flyTo(coordinates, focusTarget.zoom, { duration: 0.6 });
  }, [focusTarget, map, reportViewport]);

  return null;
}

export function HelpMap({
  places,
  selectedPlaceId,
  userPosition,
  focusTarget,
  onPlaceSelect,
  onViewportChange,
  onTileError,
}: HelpMapProps) {
  return (
    <MapContainer
      center={[lodzMapCenter[0], lodzMapCenter[1]]}
      zoom={13}
      minZoom={10}
      maxZoom={19}
      zoomControl={false}
      className={styles.leafletMap}
      aria-label="Interaktywna mapa miejsc pomocy w Łodzi"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{ tileerror: onTileError }}
      />
      <ZoomControl position="bottomright" />
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={54}
        showCoverageOnHover={false}
        iconCreateFunction={createClusterIcon}
      >
        {places.map((place) => (
          <MapMarker
            key={place.id}
            place={place}
            selected={selectedPlaceId === place.id}
            onSelect={onPlaceSelect}
          />
        ))}
      </MarkerClusterGroup>
      {userPosition ? <UserLocationMarker position={userPosition} /> : null}
      <MapViewportBridge
        places={places}
        focusTarget={focusTarget}
        onViewportChange={onViewportChange}
      />
    </MapContainer>
  );
}

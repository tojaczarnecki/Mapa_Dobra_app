"use client";

import { divIcon, type LatLngBounds, type MarkerCluster } from "leaflet";
import { useCallback, useEffect } from "react";
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
  onVisiblePlacesChange: (placeIds: string[]) => void;
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
  onVisiblePlacesChange,
}: Pick<HelpMapProps, "places" | "focusTarget" | "onVisiblePlacesChange">) {
  const reportVisiblePlaces = useCallback(
    (map: ReturnType<typeof useMap>) => {
      onVisiblePlacesChange(placeIdsWithinBounds(places, map.getBounds()));
    },
    [onVisiblePlacesChange, places],
  );

  const map = useMapEvents({
    moveend: () => reportVisiblePlaces(map),
    zoomend: () => reportVisiblePlaces(map),
  });

  useEffect(() => {
    reportVisiblePlaces(map);
  }, [map, reportVisiblePlaces]);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    map.flyTo(
      [focusTarget.coordinates[0], focusTarget.coordinates[1]],
      focusTarget.zoom,
      { duration: 0.6 },
    );
  }, [focusTarget, map]);

  return null;
}

export function HelpMap({
  places,
  selectedPlaceId,
  userPosition,
  focusTarget,
  onPlaceSelect,
  onVisiblePlacesChange,
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
        onVisiblePlacesChange={onVisiblePlacesChange}
      />
    </MapContainer>
  );
}

import type { LatLngBoundsLiteral } from "leaflet";

export type MapViewportSnapshot = {
  bounds: LatLngBoundsLiteral;
  visiblePlaceIds: string[];
  reason: "initial" | "user" | "focus";
};

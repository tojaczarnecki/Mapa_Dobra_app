"use client";

import Link from "next/link";
import { LocateFixed, MapPin } from "lucide-react";
import { useContext } from "react";
import { SearchResultsMapContext } from "@/components/places/search-results-interactive";

type LocationControlProps = {
  nearestHref?: string;
  changeHref?: string;
};

export function LocationControl({ nearestHref, changeHref = "/mapa" }: LocationControlProps) {
  const mapContext = useContext(SearchResultsMapContext);
  const locationAction = mapContext ? (
    <button type="button" className="search-location-change" aria-label="Użyj mojej lokalizacji" title="Użyj mojej lokalizacji" onClick={mapContext.locate}>
      <LocateFixed aria-hidden="true" size={19} />
    </button>
  ) : (
    <Link href={changeHref} className="search-location-change" aria-label="Zmień lokalizację" title="Zmień lokalizację">
      <LocateFixed aria-hidden="true" size={19} />
    </Link>
  );
  return (
    <div className="search-location-control" aria-label="Lokalizacja wyszukiwania">
      <div className="search-location-current">
        <MapPin aria-hidden="true" size={18} />
        <strong>Łódź</strong>
      </div>
      <div className="search-location-actions">
        {locationAction}
        {nearestHref ? <Link href={nearestHref}><LocateFixed aria-hidden="true" size={16} />Pokaż najbliższe</Link> : null}
      </div>
    </div>
  );
}

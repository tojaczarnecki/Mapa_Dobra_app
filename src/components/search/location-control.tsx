import Link from "next/link";
import { LocateFixed, MapPin } from "lucide-react";

type LocationControlProps = {
  nearestHref: string;
  changeHref?: string;
};

export function LocationControl({ nearestHref, changeHref = "/mapa" }: LocationControlProps) {
  return (
    <div className="search-location-control" aria-label="Lokalizacja wyszukiwania">
      <div className="search-location-current">
        <MapPin aria-hidden="true" size={18} />
        <strong>Łódź</strong>
      </div>
      <div className="search-location-actions">
        <Link href={changeHref}>Zmień lokalizację</Link>
        <Link href={nearestHref}><LocateFixed aria-hidden="true" size={16} />Pokaż najbliższe</Link>
      </div>
    </div>
  );
}

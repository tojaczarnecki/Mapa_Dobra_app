"use client";

import dynamic from "next/dynamic";
import { LocateFixed, MapPin, MousePointerClick } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { requestPlaceGeocoding, savePlaceLocation, type GeocodingActionState, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";

const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center rounded-lg bg-[#efede7] text-sm font-bold text-muted-foreground">Ładowanie mapy…</div>,
});

export function LocationEditor({ placeId, address, initialLatitude, initialLongitude, initialSource }: {
  placeId: string;
  address: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialSource: "GEOCODER" | "MANUAL" | null;
}) {
  const [position, setPosition] = useState<[number, number] | null>(initialLatitude !== null && initialLongitude !== null ? [initialLatitude, initialLongitude] : null);
  const [source, setSource] = useState<"GEOCODER" | "MANUAL">(initialSource ?? "MANUAL");
  const [geocoding, setGeocoding] = useState<GeocodingActionState>({});
  const [pendingGeocode, startGeocoding] = useTransition();
  const saveAction = savePlaceLocation.bind(null, placeId);
  const [saveState, formAction, pendingSave] = useActionState<VerificationActionState, FormData>(saveAction, {});

  function changePosition(next: [number, number], nextSource: "GEOCODER" | "MANUAL" = "MANUAL") {
    setPosition(next);
    setSource(nextSource);
  }

  function geocode() {
    startGeocoding(async () => setGeocoding(await requestPlaceGeocoding(placeId)));
  }

  return (
    <section id="lokalizacja" className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase text-brand-strong">Adres publiczny</p><h2 className="mt-1 text-xl font-bold">Lokalizacja na mapie</h2><p className="mt-1 text-sm text-muted-foreground">{address}</p></div>
        <button type="button" onClick={geocode} disabled={pendingGeocode} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60"><LocateFixed aria-hidden="true" size={18} />{pendingGeocode ? "Szukam…" : "Znajdź po adresie"}</button>
      </div>

      {geocoding.error ? <p className="mt-3 rounded-md border border-urgent/30 bg-urgent-soft/40 p-3 text-sm" role="alert">{geocoding.error}</p> : null}
      {geocoding.suggestions?.length ? <div className="mt-3 space-y-2" aria-label="Proponowane lokalizacje">
        <p className="text-sm font-bold">{geocoding.ambiguous ? "Wynik nie jest jednoznaczny — sprawdź go lub ustaw punkt ręcznie" : geocoding.suggestions.length === 1 ? "Proponowana lokalizacja" : "Wybierz właściwy wynik"}{geocoding.cached ? " · wynik z cache" : ""}</p>
        {geocoding.suggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => changePosition([suggestion.latitude, suggestion.longitude], "GEOCODER")} className="flex min-h-11 w-full items-start gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-brand hover:bg-brand-soft"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={17} /><span><strong className="block">{suggestion.displayName}</strong><span className="text-xs text-muted-foreground">{suggestion.latitude.toFixed(6)}, {suggestion.longitude.toFixed(6)}</span></span></button>)}
      </div> : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-border"><LocationMap position={position} onChange={(value) => changePosition(value, "MANUAL")} /></div>
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><MousePointerClick aria-hidden="true" size={16} />Kliknij mapę lub przeciągnij marker. Wynik geokodowania nie jest zapisywany bez zatwierdzenia.</p>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
        <label className="text-sm font-bold">Latitude<input name="latitude" inputMode="decimal" required value={position?.[0] ?? ""} onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value)) changePosition([value, position?.[1] ?? 19.455], "MANUAL");
        }} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25" /></label>
        <label className="text-sm font-bold">Longitude<input name="longitude" inputMode="decimal" required value={position?.[1] ?? ""} onChange={(event) => {
          const value = Number(event.target.value);
          if (Number.isFinite(value)) changePosition([position?.[0] ?? 51.7592, value], "MANUAL");
        }} className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal focus:border-brand-strong focus:outline-none focus:ring-4 focus:ring-brand-strong/25" /></label>
        <input type="hidden" name="locationSource" value={source} />
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">{position ? source === "GEOCODER" ? "Wybrano propozycję geokodera — wymaga zatwierdzenia." : "Lokalizacja ustawiona ręcznie — wymaga zapisania." : "Brak ustawionego punktu."}</p>
          <button type="submit" disabled={!position || pendingSave} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-50"><MapPin aria-hidden="true" size={18} />{pendingSave ? "Zapisuję…" : "Zatwierdź współrzędne"}</button>
        </div>
        {saveState.error ? <p className="sm:col-span-2 text-sm font-semibold text-urgent" role="alert">{saveState.error}</p> : null}
        {saveState.success ? <p className="sm:col-span-2 text-sm font-semibold text-brand-strong" role="status">{saveState.success}</p> : null}
      </form>
    </section>
  );
}

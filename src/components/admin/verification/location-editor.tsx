"use client";

import dynamic from "next/dynamic";
import { Clipboard, ExternalLink, LocateFixed, MapPin, MousePointerClick } from "lucide-react";
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
  const [source, setSource] = useState<"GEOCODER" | "MANUAL" | null>(initialSource);
  const [copied, setCopied] = useState(false);
  const [geocoding, setGeocoding] = useState<GeocodingActionState>({});
  const [pendingGeocode, startGeocoding] = useTransition();
  const saveAction = savePlaceLocation.bind(null, placeId);
  const [saveState, formAction, pendingSave] = useActionState<VerificationActionState, FormData>(saveAction, {});

  function changePosition(next: [number, number], nextSource: "GEOCODER" | "MANUAL" | null = "MANUAL") {
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
        <div className="flex flex-wrap gap-2"><a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ExternalLink aria-hidden="true" size={17} />Sprawdź adres na mapie</a><button type="button" onClick={geocode} disabled={pendingGeocode} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60"><LocateFixed aria-hidden="true" size={18} />{pendingGeocode ? "Szukam…" : "Znajdź po adresie"}</button></div>
      </div>

      {geocoding.error ? <p className="mt-3 rounded-md border border-urgent/30 bg-urgent-soft/40 p-3 text-sm" role="alert">{geocoding.error}</p> : null}
      {geocoding.suggestions?.length ? <div className="mt-3 space-y-2" aria-label="Proponowane lokalizacje">
        <p className="text-sm font-bold">{geocoding.ambiguous ? "Wyniki wymagają sprawdzenia — wybierz właściwy albo ustaw punkt ręcznie" : "Znaleziono lokalizację o wysokiej zgodności"}{geocoding.cached ? " · wynik z cache" : ""}</p>
        {geocoding.suggestions.map((suggestion) => <article key={suggestion.id} className={`rounded-lg border p-3 text-sm ${suggestion.quality === "IMPROBABLE" ? "border-urgent/35 bg-urgent-soft/30" : "border-border"}`}><div className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={17} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><strong>{suggestion.displayName}</strong><QualityBadge quality={suggestion.quality} /></div><p className="mt-1 text-xs text-muted-foreground">{suggestion.district ? `${suggestion.district} · ` : ""}{suggestion.latitude.toFixed(6)}, {suggestion.longitude.toFixed(6)}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{suggestion.qualityReasons.join(" ")}</p></div></div><div className="mt-2 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => changePosition([suggestion.latitude, suggestion.longitude], null)} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Pokaż na mapie</button><button type="button" onClick={() => changePosition([suggestion.latitude, suggestion.longitude], "GEOCODER")} disabled={suggestion.quality === "IMPROBABLE"} className="inline-flex min-h-11 items-center rounded-lg border border-brand px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-45">Wybierz</button></div></article>)}
        {geocoding.attempts?.length ? <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-brand-strong">Pokaż wykonane próby ({geocoding.attempts.length})</summary><ol className="space-y-1 text-xs text-muted-foreground">{geocoding.attempts.map((attempt) => <li key={attempt.id}><strong>{attempt.label}:</strong> {attempt.query} · {attempt.resultCount} wyników{attempt.cached ? " · cache" : ""}</li>)}</ol></details> : null}
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
        <input type="hidden" name="locationSource" value={source === "GEOCODER" ? "GEOCODER_CONFIRMED" : source ?? ""} />
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-muted-foreground">{position ? source === "GEOCODER" ? "Wybrano propozycję geokodera — wymaga zatwierdzenia." : source === "MANUAL" ? "Lokalizacja ustawiona ręcznie — wymaga zapisania." : "To tylko podgląd wyniku. Kliknij Wybierz albo ustaw punkt ręcznie." : "Brak ustawionego punktu."}</p>{position ? <button type="button" onClick={async () => { await navigator.clipboard.writeText(`${position[0].toFixed(6)}, ${position[1].toFixed(6)}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }} className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-bold text-brand-strong hover:bg-brand-soft"><Clipboard aria-hidden="true" size={16} />{copied ? "Skopiowano" : "Kopiuj współrzędne"}</button> : null}</div>
          <button type="submit" disabled={!position || !source || pendingSave} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-50"><MapPin aria-hidden="true" size={18} />{pendingSave ? "Zapisuję…" : "Zatwierdź współrzędne"}</button>
        </div>
        {saveState.error ? <p className="sm:col-span-2 text-sm font-semibold text-urgent" role="alert">{saveState.error}</p> : null}
        {saveState.success ? <p className="sm:col-span-2 text-sm font-semibold text-brand-strong" role="status">{saveState.success}</p> : null}
      </form>
    </section>
  );
}

function QualityBadge({ quality }: { quality: "HIGH" | "REVIEW" | "LOW" | "IMPROBABLE" }) {
  const labels = { HIGH: "Wysoka zgodność", REVIEW: "Wymaga sprawdzenia", LOW: "Niska zgodność", IMPROBABLE: "Nieprawdopodobny wynik" } as const;
  const tone = quality === "HIGH" ? "border-brand/40 bg-brand-soft text-[#075f53]" : quality === "IMPROBABLE" ? "border-urgent/35 bg-urgent-soft text-[#8b2d0b]" : "border-[#d7a548] bg-[#fff4d8] text-[#684500]";
  return <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{labels[quality]}</span>;
}

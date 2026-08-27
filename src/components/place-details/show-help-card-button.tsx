"use client";

import { CheckCircle2, Eye, MapPin, Navigation, Phone, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DetailListItem, PlaceDetail } from "@/data/demo-place-details";
import { directionsHref, telephoneHref } from "@/lib/places/actions";

function importantItems(place: PlaceDetail) {
  const items: DetailListItem[] = place.accommodation
    ? [
        ...place.accommodation.admissionRequirements,
        place.accommodation.sobriety,
        ...place.accommodation.animals,
      ]
    : place.requirements;

  const useful = items.filter((item) => item.status === "positive" || item.status === "warning");
  const warnings = useful.filter((item) => item.status === "warning").slice(0, 1);
  const positives = useful.filter((item) => item.status === "positive").slice(0, warnings.length ? 3 : 4);
  return [...positives, ...warnings];
}

export function ShowHelpCardButton({ place }: { place: PlaceDetail }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const routeHref = directionsHref(place);
  const callHref = telephoneHref(place.contact.phone);
  const items = useMemo(() => importantItems(place), [place]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-extrabold text-foreground transition hover:border-brand hover:bg-brand-soft"
        onClick={() => setOpen(true)}
      >
        <Eye aria-hidden="true" size={17} />
        Pokaż komuś
      </button>

      {open ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-[#102a3b]/55 p-0 sm:items-center sm:p-5" role="presentation">
          <section
            className="relative max-h-[100dvh] w-full max-w-[34rem] overflow-y-auto rounded-t-2xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="show-help-title"
          >
            <button
              ref={closeRef}
              type="button"
              className="touch-target absolute right-3 top-3 inline-flex min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              aria-label="Zamknij"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" size={23} />
            </button>

            <p className="pr-12 text-xs font-extrabold uppercase tracking-[0.12em] text-brand-strong">Mapa Dobra</p>
            <h2 id="show-help-title" className="mt-2 pr-10 text-[1.65rem] font-extrabold leading-[1.08] text-foreground">
              Tu możesz otrzymać pomoc
            </h2>

            <div className="mt-5 border-y border-border py-4">
              <h3 className="text-[1.45rem] font-extrabold leading-tight text-foreground">{place.name}</h3>
              <p className="mt-1 text-base font-bold text-muted-foreground">{place.helpTypes.join(" • ")}</p>

              <div className="mt-4 rounded-lg border border-brand/45 bg-brand-soft px-3.5 py-3">
                <p className="text-sm font-extrabold text-foreground">{place.status.label}</p>
                <p className="mt-0.5 text-base font-bold leading-6 text-foreground">{place.status.todayHours}</p>
              </div>

              <p className="mt-4 flex items-start gap-2 text-base font-bold leading-6 text-foreground">
                <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={20} />
                <span>{place.address}</span>
              </p>
              <p className="mt-1 pl-7 text-sm font-semibold text-muted-foreground">{place.distanceLabel}</p>
            </div>

            {items.length ? (
              <div className="py-4">
                <p className="text-sm font-extrabold text-foreground">Ważne przed wizytą</p>
                <ul className="mt-2 grid gap-2">
                  {items.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-[0.98rem] font-bold leading-6 text-foreground">
                      {item.status === "warning" ? (
                        <TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={19} />
                      ) : (
                        <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-brand-strong" size={19} />
                      )}
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              {routeHref ? (
                <a
                  href={routeHref}
                  target="_blank"
                  rel="noreferrer"
                  className="touch-target inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-base font-extrabold text-foreground"
                >
                  <Navigation aria-hidden="true" size={19} />
                  Jak dojść
                </a>
              ) : null}
              {callHref ? (
                <a
                  href={callHref}
                  className="touch-target inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-brand bg-white px-4 py-3 text-base font-extrabold text-foreground"
                >
                  <Phone aria-hidden="true" size={19} />
                  Zadzwoń
                </a>
              ) : null}
            </div>

            <p className="mt-3 text-center text-xs font-semibold leading-5 text-muted-foreground">
              Dane mogą się zmienić. Jeśli coś jest niepewne, najlepiej zadzwonić przed wizytą.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}

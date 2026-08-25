"use client";

import { MapPin, Phone, Clock3, Globe, Mail, Pencil, TriangleAlert } from "lucide-react";
import type { PlaceUpdateContext } from "./place-update-form";
import { PlaceCorrectionTrigger } from "@/components/place-details/place-correction-trigger";
import { contextualCorrectionLabels, type ContextualCorrectionField } from "@/lib/submissions/contextual-correction";

const chooserGroups: Array<{ label: string; fields: Array<{ field: ContextualCorrectionField; icon: typeof MapPin }> }> = [
  { label: "Dane miejsca", fields: [{ field: "address", icon: MapPin }, { field: "hours", icon: Clock3 }, { field: "phone", icon: Phone }, { field: "email", icon: Mail }, { field: "website", icon: Globe }] },
  { label: "Pomoc i warunki", fields: [{ field: "categories", icon: Pencil }, { field: "requirements", icon: Pencil }, { field: "accessibility", icon: Pencil }, { field: "accommodation", icon: Pencil }] },
  { label: "Status", fields: [{ field: "closure", icon: TriangleAlert }] },
  { label: "Inne", fields: [{ field: "description", icon: Pencil }, { field: "other", icon: Pencil }] },
];

export function PlaceCorrectionChooser({ place, autoOpenField }: { place: PlaceUpdateContext; autoOpenField?: string }) {
  const values: Record<ContextualCorrectionField, string> = {
    name: place.name,
    address: place.address,
    phone: place.phone === "Brak numeru telefonu" ? "" : place.phone ?? "",
    email: place.email ?? "",
    website: place.website ?? "",
    hours: place.hours ?? "Brak potwierdzonych godzin",
    requirements: place.requirements ?? "",
    accommodation: place.accommodation ?? "",
    accessibility: place.accessibility ?? "",
    description: place.description ?? "",
    categories: place.categories ?? "",
    closure: "Miejsce działa",
    other: "",
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-brand-strong">{place.name}</p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground">Co chcesz poprawić?</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">Wybierz jedną informację. Zobaczysz jej aktualną wartość i zmienisz tylko to, co jest nieaktualne.</p>
      </header>
      <div className="space-y-6">
        {chooserGroups.map((group) => (
          <section key={group.label} aria-labelledby={`correction-group-${group.label}`}>
            <h2 id={`correction-group-${group.label}`} className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{group.label}</h2>
            <div className="divide-y divide-border border-y border-border">
              {group.fields.map(({ field, icon: Icon }) => (
                <div key={field} className="flex min-h-16 items-center justify-between gap-3 bg-white py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon aria-hidden="true" size={19} className={field === "closure" ? "text-[#9a3412]" : "text-brand-strong"} />
                    <span className="min-w-0 text-sm font-semibold">{field === "closure" ? "Miejsce już nie działa" : contextualCorrectionLabels[field]}</span>
                  </div>
                  <PlaceCorrectionTrigger placeId={place.id} field={field} currentValue={values[field]} latitude={field === "address" ? place.latitude : undefined} longitude={field === "address" ? place.longitude : undefined} autoOpen={autoOpenField === field} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">Nie zmieniamy danych od razu. Każde zgłoszenie trafia do weryfikacji administratora.</p>
    </div>
  );
}

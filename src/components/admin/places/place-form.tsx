"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { savePlace } from "@/app/admin/(protected)/miejsca/actions";
import {
  accessibilityOptions,
  accommodationTypeLabels,
  petPolicyLabels,
  sobrietyPolicyLabels,
  verificationSourceLabels,
  weekdayOptions,
} from "@/lib/places/constants";
import type {
  AdminAccommodation,
  AdminOpeningDay,
  PlaceAdminPayload,
  PlaceFormActionState,
  TriState,
} from "@/types/place-admin";

type CategoryOption = { id: string; slug: string; name: string };

const initialActionState: PlaceFormActionState = {};
const fieldClass =
  "min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function defaultAccommodation(): AdminAccommodation {
  return {
    type: "SHELTER",
    audienceLabel: "",
    targetGroups: [],
    acceptedProfiles: [],
    admissionHoursDescription: "",
    acceptsToday: "UNKNOWN",
    lodzRegistrationRequired: "UNKNOWN",
    referralRequired: "UNKNOWN",
    documentRequired: "UNKNOWN",
    sobrietyPolicy: "UNKNOWN",
    sobrietyNote: "",
    petPolicy: "UNKNOWN",
    petNote: "",
    wheelchairAccessibility: "UNKNOWN",
    careServices: "UNKNOWN",
    partialDependencySupport: "UNKNOWN",
    mealsInfo: "",
    hygieneInfo: "",
    luggageInfo: "",
    returnTimeInfo: "",
    maxStayInfo: "",
    feeInfo: "",
    availabilityState: "UNKNOWN",
    availabilityLabel: "",
    availabilityNote: "",
    importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
    capacityGroups: [],
  };
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      <span className="mb-1.5 block">{label}{required ? " *" : ""}</span>
      <input
        className={fieldClass}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TriStateSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
}) {
  return (
    <label className="grid min-h-11 items-center gap-2 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_180px]">
      <span className="text-sm font-semibold">{label}</span>
      <select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value as TriState)}>
        <option value="YES">Tak</option>
        <option value="NO">Nie</option>
        <option value="UNKNOWN">Brak danych / nie wiem</option>
      </select>
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OpeningEditor({
  label,
  days,
  onChange,
}: {
  label: string;
  days: AdminOpeningDay[];
  onChange: (days: AdminOpeningDay[]) => void;
}) {
  function updateDay(index: number, changes: Partial<AdminOpeningDay>) {
    onChange(days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...changes } : day)));
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{label}</h3>
      <div className="divide-y divide-border rounded-lg border border-border">
        {days.map((day, dayIndex) => {
          const dayLabel = weekdayOptions.find((option) => option.value === day.weekday)?.label ?? day.weekday;
          return (
            <div key={day.weekday} className="grid gap-2 p-3 lg:grid-cols-[130px_150px_minmax(0,1fr)] lg:items-start">
              <span className="pt-2 text-sm font-bold">{dayLabel}</span>
              <select
                className={fieldClass}
                value={day.status}
                aria-label={`${label}, ${dayLabel}: status`}
                onChange={(event) => {
                  const status = event.target.value as AdminOpeningDay["status"];
                  updateDay(dayIndex, {
                    status,
                    periods: status === "OPEN" ? day.periods.length ? day.periods : [{ opensAt: "", closesAt: "" }] : [],
                  });
                }}
              >
                <option value="OPEN">Otwarte</option>
                <option value="CLOSED">Zamknięte</option>
                <option value="UNKNOWN">Brak potwierdzonych danych</option>
              </select>
              <div className="space-y-2">
                {day.status === "OPEN" ? (
                  <>
                    {day.periods.map((period, periodIndex) => (
                      <div key={`${day.weekday}-${periodIndex}`} className="grid grid-cols-[1fr_1fr_44px] gap-2">
                        <input
                          className={fieldClass}
                          type="time"
                          aria-label={`${dayLabel}: od`}
                          value={period.opensAt}
                          onChange={(event) => updateDay(dayIndex, {
                            periods: day.periods.map((item, index) => index === periodIndex ? { ...item, opensAt: event.target.value } : item),
                          })}
                        />
                        <input
                          className={fieldClass}
                          type="time"
                          aria-label={`${dayLabel}: do`}
                          value={period.closesAt}
                          onChange={(event) => updateDay(dayIndex, {
                            periods: day.periods.map((item, index) => index === periodIndex ? { ...item, closesAt: event.target.value } : item),
                          })}
                        />
                        <button
                          type="button"
                          aria-label={`Usuń przedział ${dayLabel}`}
                          disabled={day.periods.length === 1}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-surface-muted disabled:opacity-35"
                          onClick={() => updateDay(dayIndex, { periods: day.periods.filter((_, index) => index !== periodIndex) })}
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                    ))}
                    {day.periods.length < 3 ? (
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
                        onClick={() => updateDay(dayIndex, { periods: [...day.periods, { opensAt: "", closesAt: "" }] })}
                      >
                        <Plus aria-hidden="true" size={17} />
                        Dodaj przedział
                      </button>
                    ) : null}
                  </>
                ) : (
                  <input
                    className={fieldClass}
                    value={day.note}
                    aria-label={`${dayLabel}: notatka`}
                    placeholder={day.status === "CLOSED" ? "Opcjonalna notatka" : "Co wiadomo o godzinach?"}
                    onChange={(event) => updateDay(dayIndex, { note: event.target.value })}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      <Save aria-hidden="true" size={18} />
      {pending ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Zapisz jako szkic"}
    </button>
  );
}

export function PlaceForm({
  initialData,
  categories,
}: {
  initialData: PlaceAdminPayload;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialData);
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState(savePlace, initialActionState);
  const isEditing = Boolean(initialData.id);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state.placeId && state.success) {
      router.push(`/admin/miejsca/${state.placeId}`);
    }
  }, [router, state]);

  const accommodation = payload.accommodation ?? defaultAccommodation();
  const selectedCategoryNames = useMemo(
    () => categories.filter((category) => payload.categorySlugs.includes(category.slug)).map((category) => category.name),
    [categories, payload.categorySlugs],
  );

  function update(changes: Partial<PlaceAdminPayload>) {
    setDirty(true);
    setPayload((current) => ({ ...current, ...changes }));
  }

  function updateAccommodation(changes: Partial<AdminAccommodation>) {
    setDirty(true);
    setPayload((current) => ({
      ...current,
      accommodation: { ...(current.accommodation ?? defaultAccommodation()), ...changes },
    }));
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <FormSection title="Podstawowe">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nazwa"
            value={payload.name}
            required
            onChange={(name) => update({ name, ...(!isEditing && !payload.slug ? { slug: slugify(name) } : {}) })}
          />
          <Field label="Slug" value={payload.slug} required onChange={(slug) => update({ slug: slugify(slug) })} />
          <Field label="Organizacja" value={payload.organizationName} onChange={(organizationName) => update({ organizationName })} />
          <Field label="Typ miejsca" value={payload.typeLabel} onChange={(typeLabel) => update({ typeLabel })} />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-bold">Kategorie *</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const checked = payload.categorySlugs.includes(category.slug);
              return (
                <label key={category.id} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-brand-soft/40">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...payload.categorySlugs, category.slug]
                        : payload.categorySlugs.filter((slug) => slug !== category.slug);
                      update({
                        categorySlugs: next,
                        primaryCategorySlug: next.includes(payload.primaryCategorySlug) ? payload.primaryCategorySlug : next[0] ?? "",
                      });
                    }}
                  />
                  {category.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-1.5 block">Kategoria główna</span>
          <select className={fieldClass} value={payload.primaryCategorySlug} onChange={(event) => update({ primaryCategorySlug: event.target.value })}>
            {categories.filter((category) => payload.categorySlugs.includes(category.slug)).map((category) => (
              <option key={category.id} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-1.5 block">Opis</span>
          <textarea className={fieldClass} rows={5} value={payload.description} onChange={(event) => update({ description: event.target.value })} />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">Dla kogo, po jednej pozycji w wierszu</span>
            <textarea className={fieldClass} rows={4} value={payload.audience.join("\n")} onChange={(event) => update({ audience: lines(event.target.value) })} />
          </label>
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">Usługi na miejscu, po jednej pozycji w wierszu</span>
            <textarea className={fieldClass} rows={4} value={payload.services.join("\n")} onChange={(event) => update({ services: lines(event.target.value) })} />
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Wybrane: {selectedCategoryNames.join(", ") || "brak"}</p>
      </FormSection>

      <FormSection title="Adres">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ulica" value={payload.street} onChange={(street) => update({ street })} />
          <Field label="Numer" value={payload.buildingNumber} onChange={(buildingNumber) => update({ buildingNumber })} />
          <div className="sm:col-span-2"><Field label="Pełny adres" value={payload.addressLine} required onChange={(addressLine) => update({ addressLine })} /></div>
          <Field label="Kod pocztowy" value={payload.postalCode} onChange={(postalCode) => update({ postalCode })} />
          <Field label="Miasto" value={payload.city} required onChange={(city) => update({ city })} />
          <Field label="Dzielnica" value={payload.district} onChange={(district) => update({ district })} />
          <div />
          <Field label="Szerokość geograficzna" type="number" value={payload.latitude ?? ""} onChange={(value) => update({ latitude: value ? Number(value) : null })} />
          <Field label="Długość geograficzna" type="number" value={payload.longitude ?? ""} onChange={(value) => update({ longitude: value ? Number(value) : null })} />
        </div>
      </FormSection>

      <FormSection title="Kontakt">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" type="tel" value={payload.phone} onChange={(phone) => update({ phone })} />
          <Field label="E-mail" type="email" value={payload.email} onChange={(email) => update({ email })} />
          <Field label="Strona WWW" type="url" value={payload.website} onChange={(website) => update({ website })} />
          <Field label="Social media" type="url" value={payload.socialMedia} onChange={(socialMedia) => update({ socialMedia })} />
        </div>
      </FormSection>

      <FormSection title="Godziny" description="Każdy dzień może mieć do trzech przedziałów. Brak danych pozostaje osobnym stanem.">
        <div className="space-y-5">
          <OpeningEditor label="Godziny działania" days={payload.openingHours.operation} onChange={(operation) => update({ openingHours: { ...payload.openingHours, operation } })} />
          {payload.isAccommodation ? (
            <OpeningEditor label="Godziny przyjęć" days={payload.openingHours.admission} onChange={(admission) => update({ openingHours: { ...payload.openingHours, admission } })} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold">
              <span className="mb-1.5 block">Bieżący status</span>
              <select className={fieldClass} value={payload.operationalStatus} onChange={(event) => update({ operationalStatus: event.target.value as PlaceAdminPayload["operationalStatus"] })}>
                <option value="OPEN">Otwarte</option>
                <option value="CLOSED">Zamknięte</option>
                <option value="OPEN_TODAY">Otwarte dzisiaj</option>
                <option value="UNKNOWN">Brak potwierdzenia</option>
              </select>
            </label>
            <Field label="Skrót godzin na dziś" value={payload.todayHoursLabel} onChange={(todayHoursLabel) => update({ todayHoursLabel })} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Warunki pomocy" description="Tak oznacza, że warunek jest wymagany. Nie oznacza, że nie jest wymagany.">
        <div className="divide-y divide-border">
          {payload.requirements.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="grid gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
              <input className={fieldClass} value={item.label} aria-label={`Warunek ${index + 1}`} onChange={(event) => update({ requirements: payload.requirements.map((current, itemIndex) => itemIndex === index ? { ...current, label: event.target.value } : current) })} />
              <select className={fieldClass} value={item.state} aria-label={`${item.label}: stan`} onChange={(event) => update({ requirements: payload.requirements.map((current, itemIndex) => itemIndex === index ? { ...current, state: event.target.value as TriState } : current) })}>
                <option value="YES">Tak</option><option value="NO">Nie</option><option value="UNKNOWN">Brak danych</option>
              </select>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
          onClick={() => update({ requirements: [...payload.requirements, { kind: "OTHER", state: "UNKNOWN", label: "", note: "" }] })}
        >
          <Plus aria-hidden="true" size={17} /> Dodaj inny warunek
        </button>
      </FormSection>

      <FormSection title="Dostępność">
        <div className="divide-y divide-border">
          {payload.accessibility.map((item, index) => (
            <TriStateSelect
              key={`${item.feature}-${index}`}
              label={item.label || accessibilityOptions.find((option) => option.feature === item.feature)?.label || item.feature}
              value={item.state}
              onChange={(state) => update({ accessibility: payload.accessibility.map((current, itemIndex) => itemIndex === index ? { ...current, state } : current) })}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Nocleg" description="Włącz tylko dla schroniska, noclegowni, hostelu, ogrzewalni lub podobnej placówki.">
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={payload.isAccommodation}
            onChange={(event) => update({ isAccommodation: event.target.checked, accommodation: event.target.checked ? accommodation : payload.accommodation })}
          />
          To miejsce oferuje nocleg
        </label>
        {payload.isAccommodation ? (
          <div className="mt-4 space-y-5 border-t border-border pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                <span className="mb-1.5 block">Rodzaj placówki</span>
                <select className={fieldClass} value={accommodation.type} onChange={(event) => updateAccommodation({ type: event.target.value as AdminAccommodation["type"] })}>
                  {Object.entries(accommodationTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <Field label="Dla kogo, skrót" value={accommodation.audienceLabel} onChange={(audienceLabel) => updateAccommodation({ audienceLabel })} />
              <label className="block text-sm font-bold">
                <span className="mb-1.5 block">Grupy docelowe, po jednej w wierszu</span>
                <textarea className={fieldClass} rows={4} value={accommodation.targetGroups.join("\n")} onChange={(event) => updateAccommodation({ targetGroups: lines(event.target.value) })} />
              </label>
              <label className="block text-sm font-bold">
                <span className="mb-1.5 block">Profile kreatora, po jednym w wierszu</span>
                <textarea className={fieldClass} rows={4} value={accommodation.acceptedProfiles.join("\n")} onChange={(event) => updateAccommodation({ acceptedProfiles: lines(event.target.value) })} />
              </label>
            </div>
            <div className="divide-y divide-border">
              <TriStateSelect label="Przyjmuje dzisiaj" value={accommodation.acceptsToday} onChange={(acceptsToday) => updateAccommodation({ acceptsToday })} />
              <TriStateSelect label="Wymaga ostatniego meldunku w Łodzi" value={accommodation.lodzRegistrationRequired} onChange={(lodzRegistrationRequired) => updateAccommodation({ lodzRegistrationRequired })} />
              <TriStateSelect label="Wymaga skierowania" value={accommodation.referralRequired} onChange={(referralRequired) => updateAccommodation({ referralRequired })} />
              <TriStateSelect label="Wymaga dokumentu" value={accommodation.documentRequired} onChange={(documentRequired) => updateAccommodation({ documentRequired })} />
              <TriStateSelect label="Dostępne dla osoby na wózku" value={accommodation.wheelchairAccessibility} onChange={(wheelchairAccessibility) => updateAccommodation({ wheelchairAccessibility })} />
              <TriStateSelect label="Usługi opiekuńcze" value={accommodation.careServices} onChange={(careServices) => updateAccommodation({ careServices })} />
              <TriStateSelect label="Wsparcie osoby częściowo niesamodzielnej" value={accommodation.partialDependencySupport} onChange={(partialDependencySupport) => updateAccommodation({ partialDependencySupport })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold"><span className="mb-1.5 block">Trzeźwość</span><select className={fieldClass} value={accommodation.sobrietyPolicy} onChange={(event) => updateAccommodation({ sobrietyPolicy: event.target.value as AdminAccommodation["sobrietyPolicy"] })}>{Object.entries(sobrietyPolicyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="block text-sm font-bold"><span className="mb-1.5 block">Zwierzęta</span><select className={fieldClass} value={accommodation.petPolicy} onChange={(event) => updateAccommodation({ petPolicy: event.target.value as AdminAccommodation["petPolicy"] })}>{Object.entries(petPolicyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <Field label="Dodatkowe zasady trzeźwości" value={accommodation.sobrietyNote} onChange={(sobrietyNote) => updateAccommodation({ sobrietyNote })} />
              <Field label="Dodatkowe zasady dotyczące zwierząt" value={accommodation.petNote} onChange={(petNote) => updateAccommodation({ petNote })} />
              <Field label="Godziny przyjęć, opis" value={accommodation.admissionHoursDescription} onChange={(admissionHoursDescription) => updateAccommodation({ admissionHoursDescription })} />
              <Field label="Wyżywienie" value={accommodation.mealsInfo} onChange={(mealsInfo) => updateAccommodation({ mealsInfo })} />
              <Field label="Higiena" value={accommodation.hygieneInfo} onChange={(hygieneInfo) => updateAccommodation({ hygieneInfo })} />
              <Field label="Bagaż" value={accommodation.luggageInfo} onChange={(luggageInfo) => updateAccommodation({ luggageInfo })} />
              <Field label="Godzina powrotu" value={accommodation.returnTimeInfo} onChange={(returnTimeInfo) => updateAccommodation({ returnTimeInfo })} />
              <Field label="Maksymalny pobyt" value={accommodation.maxStayInfo} onChange={(maxStayInfo) => updateAccommodation({ maxStayInfo })} />
              <Field label="Odpłatność" value={accommodation.feeInfo} onChange={(feeInfo) => updateAccommodation({ feeInfo })} />
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-bold">Dostępność miejsc</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold"><span className="mb-1.5 block">Stan</span><select className={fieldClass} value={accommodation.availabilityState} onChange={(event) => updateAccommodation({ availabilityState: event.target.value as AdminAccommodation["availabilityState"] })}><option value="AVAILABLE">Są wolne miejsca</option><option value="FEW">Niewiele miejsc</option><option value="FULL">Brak miejsc</option><option value="UNKNOWN">Brak aktualnych danych</option><option value="STALE">Dane mogą być nieaktualne</option><option value="SUSPENDED">Przyjęcia wstrzymane</option></select></label>
                <Field label="Komunikat" value={accommodation.availabilityLabel} onChange={(availabilityLabel) => updateAccommodation({ availabilityLabel })} />
                <div className="sm:col-span-2"><Field label="Wyjaśnienie" value={accommodation.availabilityNote} onChange={(availabilityNote) => updateAccommodation({ availabilityNote })} /></div>
              </div>
              <div className="mt-4 space-y-2">
                {accommodation.capacityGroups.map((group, index) => (
                  <div key={group.id ?? index} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_120px_120px_44px] sm:items-end">
                    <Field label="Pula" value={group.label} onChange={(label) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item) })} />
                    <Field label="Wszystkich" type="number" value={group.totalBeds ?? ""} onChange={(value) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, totalBeds: value ? Number(value) : null } : item) })} />
                    <Field label="Wolnych" type="number" value={group.availableBeds ?? ""} onChange={(value) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, availableBeds: value ? Number(value) : null } : item) })} />
                    <button type="button" aria-label={`Usuń pulę ${group.label}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-urgent/40 text-[#8c2d0c] hover:bg-urgent-soft" onClick={() => { if (window.confirm("Usunąć tę pulę miejsc? Historia zmian pozostanie w bazie.")) updateAccommodation({ capacityGroups: accommodation.capacityGroups.filter((_, itemIndex) => itemIndex !== index) }); }}><Trash2 aria-hidden="true" size={17} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft" onClick={() => updateAccommodation({ capacityGroups: [...accommodation.capacityGroups, { label: "", totalBeds: null, availableBeds: null }] })}><Plus aria-hidden="true" size={17} /> Dodaj pulę</button>
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Weryfikacja i notatka wewnętrzna">
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
          <input type="checkbox" checked={payload.markVerified} onChange={(event) => update({ markVerified: event.target.checked })} />
          Dane zweryfikowane z placówką
        </label>
        {payload.markVerified ? (
          <label className="mt-3 block text-sm font-bold">
            <span className="mb-1.5 block">Źródło weryfikacji *</span>
            <select className={fieldClass} value={payload.verificationSource ?? ""} required onChange={(event) => update({ verificationSource: event.target.value as PlaceAdminPayload["verificationSource"] })}>
              <option value="">Wybierz źródło</option>
              {Object.entries(verificationSourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mt-3 block text-sm font-bold">
          <span className="mb-1.5 block">Notatka wewnętrzna</span>
          <textarea className={fieldClass} rows={4} value={payload.internalNote} onChange={(event) => update({ internalNote: event.target.value })} />
        </label>
      </FormSection>

      {state.error ? <p role="alert" className="rounded-lg border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm font-semibold">{state.error}</p> : null}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-[#f7f5ef]/95 px-1 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">Zmiany zostaną zapisane dopiero po użyciu przycisku.</p>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

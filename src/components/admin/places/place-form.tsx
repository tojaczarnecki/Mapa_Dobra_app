"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Power, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { savePlace } from "@/app/admin/(protected)/miejsca/actions";
import { useUnsavedChanges } from "@/components/admin/unsaved-changes";
import { LocationAutocomplete } from "@/components/location/location-autocomplete";
import { TokenInput } from "@/components/ui/token-input";
import { addressFieldsFromSuggestion } from "@/lib/places/address-form";
import {
  accessibilityOptions,
  accommodationTypeLabels,
  operationalStatusLabels,
  petPolicyLabels,
  placeStatusLabels,
  sobrietyPolicyLabels,
  verificationSourceLabels,
  weekdayOptions,
} from "@/lib/places/constants";
import { deriveTodayHoursLabel, validateOpeningSchedule } from "@/lib/places/opening-hours";
import type {
  AdminAccommodation,
  AdminOpeningDay,
  AdminSocialLink,
  PlaceAdminPayload,
  PlaceFormActionState,
  TriState,
} from "@/types/place-admin";

type CategoryOption = { id: string; slug: string; name: string; active: boolean };
type OrganizationOption = { id: string; name: string; active: boolean };

const socialPlatforms: Array<{ value: AdminSocialLink["platform"]; label: string }> = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "OTHER", label: "Inne" },
];

const formSections = [
  { id: "podstawowe", label: "Podstawowe" },
  { id: "adres", label: "Adres" },
  { id: "kontakt", label: "Kontakt" },
  { id: "godziny", label: "Godziny" },
  { id: "warunki", label: "Warunki" },
  { id: "dostepnosc", label: "Dostępność" },
  { id: "nocleg", label: "Nocleg" },
  { id: "weryfikacja", label: "Weryfikacja" },
  { id: "status", label: "Status" },
] as const;
type FormSectionId = (typeof formSections)[number]["id"];

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
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg border border-border bg-white p-4 sm:p-5 xl:scroll-mt-5">
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FormSectionNavigation() {
  const [activeSection, setActiveSection] = useState<FormSectionId>(formSections[0].id);

  useEffect(() => {
    const elements = formSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    const firstSection = elements[0];
    if (!firstSection) return;
    let animationFrame = 0;

    const updateActiveSection = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const probeLine = window.innerHeight * 0.35;
        const current = elements.reduce<HTMLElement>((active, element) => (
          element.getBoundingClientRect().top <= probeLine ? element : active
        ), firstSection);
        if (current?.id) setActiveSection(current.id as FormSectionId);
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Sekcje formularza"]');
    const activeLink = navigation?.querySelector<HTMLElement>(`a[href="#${activeSection}"]`);
    if (!navigation || !activeLink || navigation.scrollWidth <= navigation.clientWidth) return;
    navigation.scrollTo({
      left: activeLink.offsetLeft - (navigation.clientWidth - activeLink.clientWidth) / 2,
      behavior: "smooth",
    });
  }, [activeSection]);

  return (
    <nav aria-label="Sekcje formularza" className="sticky top-0 z-20 self-start overflow-x-auto border-y border-border bg-[#f7f5ef]/95 py-2 backdrop-blur xl:top-4 xl:overflow-visible xl:rounded-lg xl:border xl:bg-white xl:p-2">
      <ul className="flex w-max gap-1 xl:w-auto xl:flex-col">
        {formSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? "location" : undefined}
              className={`inline-flex min-h-11 w-full items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${activeSection === section.id ? "bg-brand-soft text-brand-strong" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"}`}
              onClick={(event) => {
                event.preventDefault();
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function OpeningEditor({
  label,
  days,
  onChange,
  disabled = false,
}: {
  label: string;
  days: AdminOpeningDay[];
  onChange: (days: AdminOpeningDay[]) => void;
  disabled?: boolean;
}) {
  const validation = validateOpeningSchedule(days);
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>(() => Object.fromEntries(days.filter((day) => day.note).map((day) => [day.weekday, true])));
  function updateDay(index: number, changes: Partial<AdminOpeningDay>) {
    onChange(days.map((day, dayIndex) => (dayIndex === index ? { ...day, ...changes } : day)));
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{label}</h3>
      {!validation.ok ? <p role="alert" className="mb-2 rounded-lg border border-urgent/40 bg-urgent-soft px-3 py-2 text-sm font-semibold text-[#8c2d0c]">{validation.error}</p> : null}
      <div className="divide-y divide-border rounded-lg border border-border">
        {days.map((day, dayIndex) => {
          const dayLabel = weekdayOptions.find((option) => option.value === day.weekday)?.label ?? day.weekday;
          return (
            <div key={day.weekday} className="grid gap-2 p-3 lg:grid-cols-[130px_150px_minmax(0,1fr)] lg:items-start">
              <span className="pt-2 text-sm font-bold">{dayLabel}</span>
              <select
                className={fieldClass}
                disabled={disabled}
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
                          disabled={disabled}
                          type="time"
                          aria-label={`${dayLabel}: od`}
                          value={period.opensAt}
                          onChange={(event) => updateDay(dayIndex, {
                            periods: day.periods.map((item, index) => index === periodIndex ? { ...item, opensAt: event.target.value } : item),
                          })}
                        />
                        <input
                          className={fieldClass}
                          disabled={disabled}
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
                          disabled={disabled || day.periods.length === 1}
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-surface-muted disabled:opacity-35"
                          onClick={() => updateDay(dayIndex, { periods: day.periods.filter((_, index) => index !== periodIndex) })}
                        >
                          <Trash2 aria-hidden="true" size={17} />
                        </button>
                      </div>
                    ))}
                    {day.periods.length < 8 ? (
                      <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"
                        onClick={() => updateDay(dayIndex, { periods: [...day.periods, { opensAt: "", closesAt: "" }] })}
                      >
                        <Plus aria-hidden="true" size={17} />
                        Dodaj przedział
                      </button>
                    ) : null}
                  </>
                ) : openNotes[day.weekday] ? (
                  <input className={fieldClass} disabled={disabled} value={day.note} aria-label={`${dayLabel}: notatka`} placeholder={day.status === "CLOSED" ? "Opcjonalna notatka" : "Co wiadomo o godzinach?"} onChange={(event) => updateDay(dayIndex, { note: event.target.value })} />
                ) : (
                  <button type="button" className="min-h-11 rounded-lg px-2 text-left text-sm font-bold text-brand-strong hover:bg-brand-soft" onClick={() => setOpenNotes((current) => ({ ...current, [day.weekday]: true }))}>+ Dodaj uwagę</button>
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
  organizations,
}: {
  initialData: PlaceAdminPayload;
  categories: CategoryOption[];
  organizations: OrganizationOption[];
}) {
  const router = useRouter();
  const [payload, setPayload] = useState(initialData);
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState(savePlace, initialActionState);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const isEditing = Boolean(initialData.id);

  useUnsavedChanges(dirty && !state.success);

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
  const availableOrganizations = useMemo(() => {
    const query = organizationQuery.trim().toLocaleLowerCase("pl-PL");
    return organizations.filter((organization) => (
      (organization.active || organization.id === payload.organizationId) &&
      (!query || organization.name.toLocaleLowerCase("pl-PL").includes(query) || organization.id === payload.organizationId)
    ));
  }, [organizationQuery, organizations, payload.organizationId]);

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
      onSubmit={(event) => {
        if (
          isEditing &&
          initialData.publicationStatus === "PUBLISHED" &&
          payload.slug !== initialData.slug &&
          !window.confirm("Zmiana slugu zmieni publiczny adres URL miejsca. Zapisać zmianę?")
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="xl:grid xl:grid-cols-[170px_minmax(0,1fr)] xl:items-start xl:gap-4">
        <FormSectionNavigation />
        <div className="min-w-0 space-y-4 pb-20 pt-4 xl:pt-0">

      <FormSection id="podstawowe" title="Podstawowe">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nazwa"
            value={payload.name}
            required
            onChange={(name) => update({ name, ...(!isEditing && !payload.slug ? { slug: slugify(name) } : {}) })}
          />
          <div>
            <Field label="Slug" value={payload.slug} required onChange={(slug) => update({ slug: slugify(slug) })} />
            {isEditing && initialData.publicationStatus === "PUBLISHED" && payload.slug !== initialData.slug ? (
              <p className="mt-2 flex gap-2 rounded-md border border-urgent/35 bg-urgent-soft px-3 py-2 text-xs font-semibold text-[#8c2d0c]">
                <AlertTriangle aria-hidden="true" className="shrink-0" size={16} />
                Zmiana slugu zmieni publiczny adres URL tego miejsca.
              </p>
            ) : null}
          </div>
          <Field label="Typ miejsca" value={payload.typeLabel} onChange={(typeLabel) => update({ typeLabel })} />
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Organizacja</span>
              <Link href="/admin/organizacje/nowa" target="_blank" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><Plus aria-hidden="true" size={16} /> Dodaj nową organizację</Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,.8fr)_minmax(220px,1.2fr)]">
              <label className="relative block">
                <span className="sr-only">Szukaj organizacji</span>
                <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={organizationQuery}
                  placeholder="Szukaj organizacji"
                  className={`${fieldClass} pl-10`}
                  onChange={(event) => {
                    event.stopPropagation();
                    setOrganizationQuery(event.target.value);
                  }}
                />
              </label>
              <label>
                <span className="sr-only">Wybierz organizację</span>
                <select className={fieldClass} value={payload.organizationId} onChange={(event) => update({ organizationId: event.target.value })}>
                  <option value="">Brak organizacji</option>
                  {availableOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id} disabled={!organization.active && organization.id !== payload.organizationId}>
                      {organization.name}{organization.active ? "" : " (zarchiwizowana)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Wybór wskazuje istniejący rekord. Wpisanie tekstu nie tworzy organizacji.</p>
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-bold">Kategorie *</legend>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const checked = payload.categorySlugs.includes(category.slug);
              return (
                <label key={category.id} className={`flex min-h-11 items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-brand-soft/40 ${category.active ? "" : "bg-surface-muted text-muted-foreground"}`}>
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
                  {category.name}{category.active ? "" : " (nieaktywna)"}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-1.5 block">Kategoria główna</span>
          <select className={fieldClass} value={payload.primaryCategorySlug} onChange={(event) => update({ primaryCategorySlug: event.target.value })}>
            {categories.filter((category) => payload.categorySlugs.includes(category.slug)).map((category) => (
              <option key={category.id} value={category.slug} disabled={!category.active && category.slug !== initialData.primaryCategorySlug}>{category.name}{category.active ? "" : " (nieaktywna)"}</option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-bold">
          <span className="mb-1.5 block">Opis</span>
          <textarea className={fieldClass} rows={5} value={payload.description} onChange={(event) => update({ description: event.target.value })} />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TokenInput label="Dla kogo" values={payload.audience} onChange={(audience) => update({ audience })} />
          <TokenInput label="Usługi na miejscu" values={payload.services} onChange={(services) => update({ services })} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Wybrane: {selectedCategoryNames.join(", ") || "brak"}</p>
      </FormSection>

      <FormSection id="adres" title="Adres">
        <label className="block text-sm font-bold">
          <span className="mb-1.5 block">Adres miejsca *</span>
          <LocationAutocomplete value={payload.addressLine} onChange={(addressLine) => update({ addressLine, latitude: null, longitude: null })} onSelect={(suggestion) => update(addressFieldsFromSuggestion(suggestion))} placeholder="Zacznij wpisywać ulicę lub adres" />
        </label>
        <details className="mt-4 rounded-lg border border-border bg-surface-muted/40 p-3">
          <summary className="cursor-pointer text-sm font-bold">Dane adresowe zaawansowane</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Ulica" value={payload.street} onChange={(street) => update({ street })} />
            <Field label="Numer" value={payload.buildingNumber} onChange={(buildingNumber) => update({ buildingNumber })} />
            <Field label="Kod pocztowy" value={payload.postalCode} onChange={(postalCode) => update({ postalCode })} />
            <Field label="Miasto" value={payload.city} required onChange={(city) => update({ city })} />
            <Field label="Dzielnica" value={payload.district} onChange={(district) => update({ district })} />
            <Field label="Szerokość geograficzna" type="number" value={payload.latitude ?? ""} onChange={(value) => update({ latitude: value ? Number(value) : null })} />
            <Field label="Długość geograficzna" type="number" value={payload.longitude ?? ""} onChange={(value) => update({ longitude: value ? Number(value) : null })} />
          </div>
        </details>
      </FormSection>

      <FormSection id="kontakt" title="Kontakt">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" type="tel" value={payload.phone} onChange={(phone) => update({ phone })} />
          <Field label="E-mail" type="email" value={payload.email} onChange={(email) => update({ email })} />
          <Field label="Strona WWW" type="url" value={payload.website} onChange={(website) => update({ website })} />
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-bold">Social media</p>
            <div className="space-y-2">
              {payload.socialLinks.map((link, index) => (
                <div key={`${link.platform}-${index}`} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]">
                  <select className={fieldClass} aria-label={`Platforma social media ${index + 1}`} value={link.platform} onChange={(event) => update({ socialLinks: payload.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, platform: event.target.value as AdminSocialLink["platform"] } : item) })}>
                    {socialPlatforms.map((platform) => <option key={platform.value} value={platform.value}>{platform.label}</option>)}
                  </select>
                  <input className={fieldClass} type="url" placeholder="https://…" aria-label={`Link social media ${index + 1}`} value={link.url} onChange={(event) => update({ socialLinks: payload.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} />
                  <button type="button" className="min-h-11 rounded-lg px-3 text-sm font-bold text-muted-foreground hover:bg-surface-muted" aria-label={`Usuń profil social media ${index + 1}`} onClick={() => update({ socialLinks: payload.socialLinks.filter((_, itemIndex) => itemIndex !== index) })}>Usuń</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft" onClick={() => update({ socialLinks: [...payload.socialLinks, { platform: "OTHER", url: "", label: "" }] })}><Plus aria-hidden="true" size={17} /> Dodaj profil</button>
          </div>
        </div>
      </FormSection>

      <FormSection id="godziny" title="Godziny" description="Każdy dzień może mieć kilka przedziałów. Brak danych pozostaje osobnym stanem.">
        <div className="space-y-5">
          <OpeningEditor label="Godziny działania" days={payload.openingHours.operation} onChange={(operation) => update({ openingHours: { ...payload.openingHours, operation } })} />
          {payload.isAccommodation ? (
            <OpeningEditor label="Godziny przyjęć" days={payload.openingHours.admission} onChange={(admission) => update({ openingHours: { ...payload.openingHours, admission } })} />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold sm:col-start-2">
              <span className="mb-1.5 block">Skrót godzin na dziś</span>
              <input className={`${fieldClass} bg-surface-muted`} readOnly value={deriveTodayHoursLabel(payload.openingHours.operation)} />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Wyliczany automatycznie z godzin działania.</span>
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection id="warunki" title="Warunki pomocy" description="Tak oznacza, że warunek jest wymagany. Nie oznacza, że nie jest wymagany.">
        <div className="divide-y divide-border">
          {payload.requirements.map((item, index) => (
            <div key={`${item.kind}-${index}`} className="grid gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_170px_minmax(180px,.8fr)] lg:items-center">
              <input className={fieldClass} value={item.label} aria-label={`Warunek ${index + 1}`} onChange={(event) => update({ requirements: payload.requirements.map((current, itemIndex) => itemIndex === index ? { ...current, label: event.target.value } : current) })} />
              <select className={fieldClass} value={item.state} aria-label={`${item.label}: stan`} onChange={(event) => update({ requirements: payload.requirements.map((current, itemIndex) => itemIndex === index ? { ...current, state: event.target.value as TriState } : current) })}>
                <option value="YES">Tak</option><option value="NO">Nie</option><option value="UNKNOWN">Brak danych</option>
              </select>
              <input className={`${fieldClass} sm:col-span-2 lg:col-span-1`} value={item.note} aria-label={`${item.label}: notatka`} placeholder="Opcjonalna informacja" onChange={(event) => update({ requirements: payload.requirements.map((current, itemIndex) => itemIndex === index ? { ...current, note: event.target.value } : current) })} />
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

      <FormSection id="dostepnosc" title="Dostępność">
        <div className="divide-y divide-border">
          {payload.accessibility.map((item, index) => (
            <div key={`${item.feature}-${index}`} className="grid gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_170px_minmax(180px,.8fr)] lg:items-center">
              <input className={fieldClass} value={item.label || accessibilityOptions.find((option) => option.feature === item.feature)?.label || item.feature} aria-label={`Cecha dostępności ${index + 1}`} onChange={(event) => update({ accessibility: payload.accessibility.map((current, itemIndex) => itemIndex === index ? { ...current, label: event.target.value } : current) })} />
              <select className={fieldClass} value={item.state} aria-label={`${item.label}: stan`} onChange={(event) => update({ accessibility: payload.accessibility.map((current, itemIndex) => itemIndex === index ? { ...current, state: event.target.value as TriState } : current) })}>
                <option value="YES">Tak</option><option value="NO">Nie</option><option value="UNKNOWN">Brak danych</option>
              </select>
              <input className={`${fieldClass} sm:col-span-2 lg:col-span-1`} value={item.note} aria-label={`${item.label}: notatka`} placeholder="Opcjonalna informacja" onChange={(event) => update({ accessibility: payload.accessibility.map((current, itemIndex) => itemIndex === index ? { ...current, note: event.target.value } : current) })} />
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft" onClick={() => update({ accessibility: [...payload.accessibility, { feature: "OTHER", state: "UNKNOWN", label: "", note: "" }] })}><Plus aria-hidden="true" size={17} /> Dodaj inną cechę</button>
      </FormSection>

      <FormSection id="nocleg" title="Nocleg" description="Włącz tylko dla schroniska, noclegowni, hostelu, ogrzewalni lub podobnej placówki.">
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
                <TokenInput label="Grupy docelowe" values={accommodation.targetGroups} onChange={(targetGroups) => updateAccommodation({ targetGroups })} />
              </label>
              <label className="block text-sm font-bold">
                <span className="mb-1.5 block">Profile kreatora, po jednym w wierszu</span>
                <TokenInput label="Profile kreatora" values={accommodation.acceptedProfiles} onChange={(acceptedProfiles) => updateAccommodation({ acceptedProfiles })} />
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
              <div className="sm:col-span-2"><Field label="Dodatkowe informacje noclegowe" value={accommodation.importantNote} onChange={(importantNote) => updateAccommodation({ importantNote })} /></div>
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
                  <div key={group.id ?? index} className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_120px_120px_44px] sm:items-end ${group.active ? "border-border" : "border-dashed border-border bg-surface-muted/70"}`}>
                    <Field label="Pula" value={group.label} onChange={(label) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, label } : item) })} />
                    <Field label="Wszystkich" type="number" value={group.totalBeds ?? ""} onChange={(value) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, totalBeds: value ? Number(value) : null } : item) })} />
                    <Field label="Wolnych" type="number" value={group.availableBeds ?? ""} onChange={(value) => updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, availableBeds: value ? Number(value) : null } : item) })} />
                    <button type="button" title={group.active ? "Wyłącz pulę" : "Włącz pulę"} aria-label={`${group.active ? "Wyłącz" : "Włącz"} pulę ${group.label}`} className={`inline-flex min-h-11 items-center justify-center rounded-lg border ${group.active ? "border-urgent/40 text-[#8c2d0c] hover:bg-urgent-soft" : "border-brand/40 text-brand-strong hover:bg-brand-soft"}`} onClick={() => { if (!group.active || window.confirm("Wyłączyć tę pulę? Rekord i historia dostępności pozostaną w bazie.")) updateAccommodation({ capacityGroups: accommodation.capacityGroups.map((item, itemIndex) => itemIndex === index ? { ...item, active: !item.active } : item) }); }}>{group.active ? <Power aria-hidden="true" size={17} /> : <RotateCcw aria-hidden="true" size={17} />}</button>
                    {!group.active ? <span className="text-xs font-bold text-muted-foreground sm:col-span-4">Pula wyłączona. Nie jest używana publicznie ani w szybkim podsumowaniu.</span> : null}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Puste pole liczby miejsc oznacza brak aktualnych danych, nie zero.</p>
              <button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft" onClick={() => updateAccommodation({ capacityGroups: [...accommodation.capacityGroups, { label: "", totalBeds: null, availableBeds: null, active: true }] })}><Plus aria-hidden="true" size={17} /> Dodaj pulę</button>
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection id="weryfikacja" title="Weryfikacja i notatka wewnętrzna">
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

      <FormSection id="status" title="Statusy" description="Status publikacji steruje widocznością miejsca. Stan działania opisuje jego bieżące funkcjonowanie.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">Status publikacji</span>
            <input className={`${fieldClass} bg-surface-muted`} readOnly value={placeStatusLabels[payload.publicationStatus]} />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Zmienisz go świadomie na ekranie szczegółów miejsca.</span>
          </label>
          <label className="block text-sm font-bold">
            <span className="mb-1.5 block">Stan działania</span>
            <select className={fieldClass} value={payload.operationalStatus} onChange={(event) => update({ operationalStatus: event.target.value as PlaceAdminPayload["operationalStatus"] })}>
              {Object.entries(operationalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">Nie zmienia automatycznie statusu publikacji.</span>
          </label>
        </div>
      </FormSection>

      {state.error ? <p role="alert" className="rounded-lg border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm font-semibold">{state.error}</p> : null}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-border bg-white/95 px-1 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">Zmiany zostaną zapisane dopiero po użyciu przycisku.</p>
        <SubmitButton isEditing={isEditing} />
      </div>
    </form>
  );
}

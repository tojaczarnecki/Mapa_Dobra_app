"use client";

import { ChevronDown, Search, UserPlus, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { AdminPermission, AdminRole } from "@/generated/prisma/enums";
import type { UserActionState } from "@/app/admin/(protected)/uzytkownicy/actions";
import { CopyAccessLink } from "@/components/admin/users/copy-access-link";
import {
  allAdminPermissions,
  permissionLabels,
  placeManagerDefaultPermissions,
  placeScopedPermissions,
} from "@/lib/admin/permissions";

type RecordKindFilter = "PRODUCTION" | "DEMO" | "TEST" | "ALL";
type PlaceOption = {
  id: string;
  name: string;
  addressLine: string;
  recordKind: "PRODUCTION" | "DEMO" | "TEST";
  isAccommodation: boolean;
};
type Access = { placeId: string; permissions: AdminPermission[] };
type UserInput = {
  displayName: string;
  email: string;
  role: AdminRole;
  overrides: Array<{ permission: AdminPermission; effect: "ALLOW" | "DENY" }>;
  placeAccess: Access[];
};

const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "Superadministrator",
  ADMIN: "Administrator",
  MODERATOR: "Moderator",
  PLACE_MANAGER: "Pracownik placówki",
  VIEWER: "Tylko odczyt",
};

const roleSummaries: Record<AdminRole, string> = {
  SUPER_ADMIN: "Pełny dostęp do panelu, użytkowników, konfiguracji i publikacji danych.",
  ADMIN: "Zarządzanie danymi operacyjnymi bez krytycznego zarządzania kontami SUPER_ADMIN.",
  MODERATOR: "Weryfikacja miejsc i moderacja zgłoszeń. Publikacja wymaga osobnego zezwolenia.",
  PLACE_MANAGER: "Domyślnie może aktualizować wyłącznie dozwolone dane w przypisanych placówkach. Nie ma dostępu do pozostałej bazy Mapy Dobra.",
  VIEWER: "Dostęp tylko do odczytu w sekcjach wynikających z roli.",
};

const recordKindLabels: Record<RecordKindFilter, string> = {
  PRODUCTION: "Produkcyjne",
  DEMO: "Demo",
  TEST: "Test",
  ALL: "Wszystkie",
};

const recordKindBadgeLabels: Record<PlaceOption["recordKind"], string> = {
  PRODUCTION: "Produkcyjne",
  DEMO: "Demo",
  TEST: "Test",
};

function recordKindBadge(kind: PlaceOption["recordKind"]) {
  if (kind === "TEST") return "border-[#e9521a]/30 bg-[#fff1eb] text-[#9a3510]";
  if (kind === "DEMO") return "border-border bg-surface-muted text-muted-foreground";
  return "border-brand/25 bg-brand-soft text-brand-strong";
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60"
    >
      <UserPlus aria-hidden="true" size={18} />
      {pending ? "Zapisywanie..." : editing ? "Zapisz zmiany" : "Utwórz i wygeneruj zaproszenie"}
    </button>
  );
}

export function UserForm({
  action,
  places,
  initial,
}: {
  action: (state: UserActionState, data: FormData) => Promise<UserActionState>;
  places: PlaceOption[];
  initial?: UserInput;
}) {
  const [state, formAction] = useActionState(action, {});
  const [role, setRole] = useState<AdminRole>(initial?.role ?? "PLACE_MANAGER");
  const [overrideState, setOverrideState] = useState<Record<string, "ROLE" | "ALLOW" | "DENY">>(
    () => Object.fromEntries(initial?.overrides.map((item) => [item.permission, item.effect]) ?? []),
  );
  const [access, setAccess] = useState<Record<string, AdminPermission[]>>(
    () => Object.fromEntries(initial?.placeAccess.map((item) => [item.placeId, item.permissions]) ?? []),
  );
  const [query, setQuery] = useState("");
  const [recordKind, setRecordKind] = useState<RecordKindFilter>("PRODUCTION");
  const [accommodationOnly, setAccommodationOnly] = useState(false);

  const selectedPlaces = useMemo(
    () => places.filter((place) => Boolean(access[place.id])),
    [access, places],
  );
  const visiblePlaces = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase("pl-PL");
    return places.filter((place) => {
      const matchesQuery = `${place.name} ${place.addressLine}`
        .toLocaleLowerCase("pl-PL")
        .includes(normalizedQuery);
      const matchesKind = recordKind === "ALL" || place.recordKind === recordKind;
      const matchesAccommodation = role !== "PLACE_MANAGER" || !accommodationOnly || place.isAccommodation;
      return matchesQuery && matchesKind && matchesAccommodation;
    });
  }, [accommodationOnly, places, query, recordKind, role]);

  const allowPermissions = allAdminPermissions.filter(
    (permission) => overrideState[permission] === "ALLOW",
  );
  const denyPermissions = allAdminPermissions.filter(
    (permission) => overrideState[permission] === "DENY",
  );
  const placeAccess = Object.entries(access).map(([placeId, permissions]) => ({
    placeId,
    permissions,
  }));

  function togglePlace(placeId: string, selected: boolean) {
    setAccess((current) => {
      const next = { ...current };
      if (selected) next[placeId] = [...placeManagerDefaultPermissions];
      else delete next[placeId];
      return next;
    });
  }

  function toggleScope(placeId: string, permission: AdminPermission, selected: boolean) {
    setAccess((current) => ({
      ...current,
      [placeId]: selected
        ? [...new Set([...(current[placeId] ?? []), permission])]
        : (current[placeId] ?? []).filter((item) => item !== permission),
    }));
  }

  return (
    <form action={formAction} className="min-w-0 space-y-5 pb-24">
      <input type="hidden" name="allowPermissions" value={JSON.stringify(allowPermissions)} />
      <input type="hidden" name="denyPermissions" value={JSON.stringify(denyPermissions)} />
      <input type="hidden" name="placeAccess" value={JSON.stringify(placeAccess)} />

      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold">Konto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Imię i nazwa / nazwa wyświetlana
            <input name="displayName" defaultValue={initial?.displayName ?? ""} required maxLength={160} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
          </label>
          <label className="text-sm font-bold">
            E-mail
            <input name="email" type="email" defaultValue={initial?.email ?? ""} required maxLength={320} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
          </label>
          <label className="text-sm font-bold">
            Rola
            <select name="role" value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2">
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="rounded-lg bg-surface-muted p-3 text-sm sm:self-end">
            <strong className="block">Zakres roli</strong>
            <p className="mt-1 text-muted-foreground">{roleSummaries[role]}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Użytkownik ustawi własne hasło z jednorazowego linku. Zaproszenie jest ważne 48 godzin.</p>
      </section>

      <section className="min-w-0 rounded-lg border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Przypisane placówki</h2>
            <p className="mt-1 text-sm text-muted-foreground">Wybierz miejsca, do których użytkownik ma otrzymać dostęp.</p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-strong">Wybrane placówki: {selectedPlaces.length}</span>
        </div>

        {selectedPlaces.length ? (
          <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label="Wybrane placówki">
            {selectedPlaces.map((place) => (
              <span key={place.id} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-3 text-sm font-semibold text-brand-strong">
                <span className="truncate">{place.name}</span>
                <button type="button" onClick={() => togglePlace(place.id, false)} title={`Usuń przypisanie: ${place.name}`} aria-label={`Usuń przypisanie: ${place.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-md hover:bg-white/70">
                  <X aria-hidden="true" size={16} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm text-muted-foreground">Nie wybrano jeszcze żadnej placówki.</p>
        )}

        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-end">
          <label className="relative block min-w-0">
            <span className="sr-only">Szukaj placówki</span>
            <Search aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie lub adresie" className="min-h-11 w-full rounded-lg border border-border pl-10 pr-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" />
          </label>
          <div className="flex min-w-0 flex-wrap gap-2" aria-label="Rodzaj danych placówki">
            {(Object.keys(recordKindLabels) as RecordKindFilter[]).map((kind) => (
              <button key={kind} type="button" onClick={() => setRecordKind(kind)} aria-pressed={recordKind === kind} className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${recordKind === kind ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-white text-muted-foreground hover:border-brand"}`}>
                {recordKindLabels[kind]}
              </button>
            ))}
            {role === "PLACE_MANAGER" ? (
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-bold">
                <input type="checkbox" checked={accommodationOnly} onChange={(event) => setAccommodationOnly(event.target.checked)} className="h-5 w-5 accent-brand" />
                Tylko noclegi
              </label>
            ) : null}
          </div>
        </div>

        <div className="mt-3 max-h-[430px] space-y-1.5 overflow-y-auto pr-1">
          {visiblePlaces.length ? visiblePlaces.map((place) => {
            const selected = Boolean(access[place.id]);
            return (
              <label key={place.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${selected ? "border-brand bg-brand-soft/35" : "border-border hover:border-brand/60"}`}>
                <input type="checkbox" checked={selected} onChange={(event) => togglePlace(place.id, event.target.checked)} className="h-5 w-5 shrink-0 accent-brand" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{place.name}</strong>
                  <span className="block truncate text-xs text-muted-foreground">{place.addressLine}</span>
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${recordKindBadge(place.recordKind)}`}>{recordKindBadgeLabels[place.recordKind]}</span>
              </label>
            );
          }) : <p className="rounded-lg bg-surface-muted p-4 text-sm text-muted-foreground">Brak placówek pasujących do filtrów.</p>}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold">Zakres dostępu do placówek</h2>
        <p className="mt-1 text-sm text-muted-foreground">Określ osobno, jakie dane użytkownik może zmieniać w każdym przypisanym miejscu.</p>
        {selectedPlaces.length ? (
          <div className="mt-4 space-y-3">
            {selectedPlaces.map((place) => (
              <fieldset key={place.id} className="min-w-0 rounded-lg border border-border p-3">
                <legend className="max-w-full px-1 text-sm font-bold"><span className="block truncate">{place.name}</span></legend>
                <div className="grid gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
                  {placeScopedPermissions.map((permission) => (
                    <label key={permission} className="flex min-h-11 items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" checked={access[place.id]?.includes(permission) ?? false} onChange={(event) => toggleScope(place.id, permission, event.target.checked)} className="h-5 w-5 shrink-0 accent-brand" />
                      {permissionLabels[permission]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">Wybierz placówkę, aby ustawić jej zakres dostępu.</p>}
      </section>

      <details className="group rounded-lg border border-border bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span>
            <strong className="block text-lg">Zaawansowane uprawnienia</strong>
            <span className="mt-1 block text-sm font-normal text-muted-foreground">W większości przypadków wystarczą uprawnienia wynikające z wybranej roli. Tutaj możesz zmienić pojedyncze uprawnienia tylko dla tego użytkownika.</span>
          </span>
          <ChevronDown aria-hidden="true" className="shrink-0 transition group-open:rotate-180" size={20} />
        </summary>
        <div className="border-t border-border px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="grid gap-x-5 sm:grid-cols-2">
            {allAdminPermissions.map((permission) => (
              <label key={permission} className="flex min-h-11 items-center justify-between gap-3 border-b border-border py-2 text-sm">
                <span>{permissionLabels[permission]}</span>
                <select aria-label={`${permissionLabels[permission]}: ustawienie uprawnienia`} value={overrideState[permission] ?? "ROLE"} onChange={(event) => setOverrideState((current) => ({ ...current, [permission]: event.target.value as "ROLE" | "ALLOW" | "DENY" }))} className="min-h-11 rounded-md border border-border bg-white px-2 text-xs font-bold">
                  <option value="ROLE">Domyślnie</option>
                  <option value="ALLOW">Zezwól</option>
                  <option value="DENY">Zablokuj</option>
                </select>
              </label>
            ))}
          </div>
        </div>
      </details>

      {state.error ? <p role="alert" className="rounded-lg bg-urgent-soft p-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
      {state.success ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft p-4"><p className="text-sm font-semibold">{state.success}</p>{state.accessPath ? <CopyAccessLink path={state.accessPath} /> : null}</div> : null}
      <div className="sticky bottom-3 z-10 flex justify-end rounded-lg border border-border bg-white/95 p-3 shadow-lg backdrop-blur"><SubmitButton editing={Boolean(initial)} /></div>
    </form>
  );
}

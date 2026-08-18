"use client";

import { Search, UserPlus } from "lucide-react";
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

type PlaceOption = { id: string; name: string; addressLine: string; recordKind: string };
type Access = { placeId: string; permissions: AdminPermission[] };
type UserInput = {
  displayName: string;
  email: string;
  role: AdminRole;
  overrides: Array<{ permission: AdminPermission; effect: "ALLOW" | "DENY" }>;
  placeAccess: Access[];
};

const roleLabels: Record<AdminRole, string> = { SUPER_ADMIN: "Superadministrator", ADMIN: "Administrator", MODERATOR: "Moderator", PLACE_MANAGER: "Pracownik placówki", VIEWER: "Tylko odczyt" };
function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:opacity-60"><UserPlus aria-hidden="true" size={18} />{pending ? "Zapisywanie..." : editing ? "Zapisz zmiany" : "Utwórz i wygeneruj zaproszenie"}</button>;
}

export function UserForm({ action, places, initial }: { action: (state: UserActionState, data: FormData) => Promise<UserActionState>; places: PlaceOption[]; initial?: UserInput }) {
  const [state, formAction] = useActionState(action, {});
  const [role, setRole] = useState<AdminRole>(initial?.role ?? "PLACE_MANAGER");
  const [overrideState, setOverrideState] = useState<Record<string, "ROLE" | "ALLOW" | "DENY">>(() => Object.fromEntries(initial?.overrides.map((item) => [item.permission, item.effect]) ?? []));
  const [access, setAccess] = useState<Record<string, AdminPermission[]>>(() => Object.fromEntries(initial?.placeAccess.map((item) => [item.placeId, item.permissions]) ?? []));
  const [query, setQuery] = useState("");
  const visiblePlaces = useMemo(() => places.filter((place) => `${place.name} ${place.addressLine}`.toLocaleLowerCase("pl-PL").includes(query.toLocaleLowerCase("pl-PL"))), [places, query]);
  const allowPermissions = allAdminPermissions.filter((permission) => overrideState[permission] === "ALLOW");
  const denyPermissions = allAdminPermissions.filter((permission) => overrideState[permission] === "DENY");
  const placeAccess = Object.entries(access).map(([placeId, permissions]) => ({ placeId, permissions }));

  function togglePlace(placeId: string, selected: boolean) {
    setAccess((current) => { const next = { ...current }; if (selected) next[placeId] = [...placeManagerDefaultPermissions]; else delete next[placeId]; return next; });
  }
  function toggleScope(placeId: string, permission: AdminPermission, selected: boolean) {
    setAccess((current) => ({ ...current, [placeId]: selected ? [...new Set([...(current[placeId] ?? []), permission])] : (current[placeId] ?? []).filter((item) => item !== permission) }));
  }

  return <form action={formAction} className="space-y-5 pb-24">
    <input type="hidden" name="allowPermissions" value={JSON.stringify(allowPermissions)} />
    <input type="hidden" name="denyPermissions" value={JSON.stringify(denyPermissions)} />
    <input type="hidden" name="placeAccess" value={JSON.stringify(placeAccess)} />
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Konto</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">Imię i nazwa / nazwa wyświetlana<input name="displayName" defaultValue={initial?.displayName ?? ""} required maxLength={160} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" /></label>
      <label className="text-sm font-bold">E-mail<input name="email" type="email" defaultValue={initial?.email ?? ""} required maxLength={320} className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/25" /></label>
      <label className="text-sm font-bold">Rola<select name="role" value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-3 py-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div><p className="mt-3 text-xs text-muted-foreground">Użytkownik ustawi własne hasło z jednorazowego linku. Zaproszenie jest ważne 48 godzin.</p></section>

    <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Indywidualne uprawnienia</h2><p className="mt-1 text-sm text-muted-foreground">Pozostaw „Z roli”, aby użyć bezpiecznych ustawień domyślnych. ALLOW i DENY dotyczą tylko tego konta.</p><div className="mt-4 grid gap-x-5 sm:grid-cols-2">{allAdminPermissions.map((permission) => <label key={permission} className="flex min-h-11 items-center justify-between gap-3 border-b border-border py-2 text-sm"><span>{permissionLabels[permission]}</span><select aria-label={`${permissionLabels[permission]}: źródło uprawnienia`} value={overrideState[permission] ?? "ROLE"} onChange={(event) => setOverrideState((current) => ({ ...current, [permission]: event.target.value as "ROLE" | "ALLOW" | "DENY" }))} className="min-h-10 rounded-md border border-border bg-white px-2 text-xs font-bold"><option value="ROLE">Z roli</option><option value="ALLOW">Nadaj</option><option value="DENY">Odbierz</option></select></label>)}</div></section>

    <section className="rounded-lg border border-border bg-white p-4 sm:p-5"><h2 className="text-lg font-bold">Przypisane placówki</h2><p className="mt-1 text-sm text-muted-foreground">Uprawnienia z tej sekcji działają tylko dla zaznaczonego miejsca.</p><label className="relative mt-4 block"><Search aria-hidden="true" size={17} className="absolute left-3 top-3.5 text-muted-foreground" /><span className="sr-only">Szukaj placówki</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie lub adresie" className="min-h-11 w-full rounded-lg border border-border pl-10 pr-3" /></label><div className="mt-3 max-h-[540px] space-y-2 overflow-y-auto pr-1">{visiblePlaces.map((place) => { const selected = Boolean(access[place.id]); return <div key={place.id} className={`rounded-lg border p-3 ${selected ? "border-brand bg-brand-soft/35" : "border-border"}`}><label className="flex min-h-11 items-start gap-3"><input type="checkbox" checked={selected} onChange={(event) => togglePlace(place.id, event.target.checked)} className="mt-1.5 h-5 w-5 accent-brand" /><span><strong className="block text-sm">{place.name} <span className="ml-1 text-xs text-muted-foreground">{place.recordKind}</span></strong><span className="text-xs text-muted-foreground">{place.addressLine}</span></span></label>{selected ? <div className="mt-2 grid gap-1 border-t border-border pt-2 sm:grid-cols-2">{placeScopedPermissions.map((permission) => <label key={permission} className="flex min-h-11 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={access[place.id]?.includes(permission) ?? false} onChange={(event) => toggleScope(place.id, permission, event.target.checked)} className="h-5 w-5 accent-brand" />{permissionLabels[permission]}</label>)}</div> : null}</div>; })}</div></section>
    {state.error ? <p role="alert" className="rounded-lg bg-urgent-soft p-3 text-sm font-semibold text-[#8c2d0c]">{state.error}</p> : null}
    {state.success ? <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft p-4"><p className="text-sm font-semibold">{state.success}</p>{state.accessPath ? <CopyAccessLink path={state.accessPath} /> : null}</div> : null}
    <div className="sticky bottom-3 z-10 flex justify-end rounded-lg border border-border bg-white/95 p-3 shadow-lg backdrop-blur"><SubmitButton editing={Boolean(initial)} /></div>
  </form>;
}

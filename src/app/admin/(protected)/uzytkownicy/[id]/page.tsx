import Link from "next/link";
import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { UserAccountActions } from "@/components/admin/users/user-account-actions";
import { DetailSection, InfoRows } from "@/components/admin/detail-section";
import { allAdminPermissions, permissionLabels, permissionOrigin, resolveEffectivePermissions } from "@/lib/admin/permissions";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader, AdminSection } from "@/components/admin/admin-ui";

const roleLabels = { SUPER_ADMIN: "Superadministrator", ADMIN: "Administrator", MODERATOR: "Moderator", PLACE_MANAGER: "Pracownik placówki", VIEWER: "Tylko odczyt" } as const;
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Brak";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("MANAGE_USERS");
  const { id } = await params;
  const user = await prisma.adminUser.findUnique({ where: { id }, include: { permissionOverrides: true, placeAccesses: { where: { active: true }, include: { place: { select: { id: true, name: true, addressLine: true, organization: { select: { name: true } } } } } }, sessions: { where: { expiresAt: { gt: new Date() } }, select: { id: true } } } });
  if (!user) notFound();
  const audit = await prisma.auditLog.findMany({ where: { adminUserId: user.id }, orderBy: { createdAt: "desc" }, take: 12 });
  const effective = resolveEffectivePermissions(user.role, user.permissionOverrides);
  const accessSummary = effective.length ? effective.map((permission) => permissionLabels[permission]) : ["Nie ma aktywnych uprawnień poza dostępem do konta."];
  return <div className="space-y-5"><AdminPageHeader backHref="/admin/uzytkownicy" backLabel="Wróć do użytkowników" eyebrow="Konto i dostęp" title={user.displayName} description={`${roleLabels[user.role]} · ${user.email}`} action={<Link href={`/admin/uzytkownicy/${user.id}/edytuj`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold"><Pencil aria-hidden="true" size={17} />Edytuj dostęp</Link>} />
    <AdminSection title="Ten użytkownik może:" description="Poniżej pokazany jest wynik roli i indywidualnych wyjątków. Szczegóły źródła uprawnienia znajdziesz niżej."><ul className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-2 sm:px-5">{accessSummary.map((permission) => <li key={permission} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-strong" />{permission}</li>)}</ul></AdminSection>
    <DetailSection title="Konto"><InfoRows rows={[{ label: "Rola", value: roleLabels[user.role] }, { label: "Stan", value: user.active ? "Aktywne" : "Nieaktywne" }, { label: "Ostatnie logowanie", value: date(user.lastLoginAt) }, { label: "Utworzono", value: date(user.createdAt) }, { label: "Aktywne sesje", value: String(user.sessions.length) }]} /><div className="mt-5 border-t border-border pt-4"><UserAccountActions userId={user.id} active={user.active} /></div></DetailSection>
    <DetailSection title="Uprawnienia"><div className="grid gap-x-5 sm:grid-cols-2">{allAdminPermissions.map((permission) => { const origin = permissionOrigin(user.role, user.permissionOverrides, permission); const enabled = effective.includes(permission); return <div key={permission} className="flex min-h-11 items-center justify-between gap-3 border-b border-border py-2 text-sm"><span>{permissionLabels[permission]}</span><span className={`text-xs font-bold ${enabled ? "text-brand-strong" : "text-muted-foreground"}`}>{enabled ? "TAK" : "NIE"} · {origin === "ROLE" ? "z roli" : origin === "INDIVIDUAL_ALLOW" ? "nadane" : origin === "INDIVIDUAL_DENY" ? "odebrane" : "brak"}</span></div>; })}</div></DetailSection>
    <DetailSection title="Przypisane miejsca">{user.role === "SUPER_ADMIN" ? <p className="text-sm leading-6 text-muted-foreground">Superadministrator ma dostęp do wszystkich placówek i nie wymaga indywidualnego przypisania.</p> : user.placeAccesses.length ? <div className="divide-y divide-border">{user.placeAccesses.map((access) => <article key={access.id} className="py-3 first:pt-0"><Link href={`/admin/miejsca/${access.place.id}`} className="font-bold text-brand-strong hover:underline">{access.place.name}</Link><p className="mt-1 text-sm text-muted-foreground">{access.place.addressLine}{access.place.organization ? ` · ${access.place.organization.name}` : ""}</p><p className="mt-2 text-xs">{access.permissions.map((permission) => permissionLabels[permission]).join(" · ")}</p></article>)}</div> : <p className="text-sm text-muted-foreground">Brak przypisanych placówek.</p>}</DetailSection>
    <DetailSection title="Ostatnia aktywność">{audit.length ? <ol className="divide-y divide-border">{audit.map((entry) => <li key={entry.id} className="py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{entry.action.replaceAll("_", " ")}</strong><time className="text-xs text-muted-foreground">{date(entry.createdAt)}</time></div>{entry.note ? <p className="mt-1 text-muted-foreground">{entry.note}</p> : null}</li>)}</ol> : <p className="text-sm text-muted-foreground">Brak aktywności.</p>}</DetailSection>
  </div>;
}

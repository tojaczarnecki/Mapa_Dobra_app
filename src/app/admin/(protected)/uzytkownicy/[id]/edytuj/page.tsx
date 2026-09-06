import { notFound } from "next/navigation";
import { updateAdminUser } from "@/app/admin/(protected)/uzytkownicy/actions";
import { UserForm } from "@/components/admin/users/user-form";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/admin-ui";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("MANAGE_USERS");
  const { id } = await params;
  const [user, placeRows] = await Promise.all([
    prisma.adminUser.findUnique({ where: { id }, include: { permissionOverrides: true, placeAccesses: { where: { active: true } } } }),
    prisma.place.findMany({ select: { id: true, name: true, addressLine: true, recordKind: true, accommodation: { select: { id: true } } }, orderBy: { name: "asc" } }),
  ]);
  if (!user) notFound();
  const places = placeRows.map(({ accommodation, ...place }) => ({
    ...place,
    isAccommodation: Boolean(accommodation),
  }));
  return <div className="space-y-5"><AdminPageHeader backHref={`/admin/uzytkownicy/${user.id}`} backLabel="Wróć do użytkownika" eyebrow="Konto i dostęp" title="Edytuj użytkownika" description="Zmiany roli, wyjątków i przypisanych placówek wpływają na zakres działań tego konta." /><UserForm action={updateAdminUser.bind(null, user.id)} places={places} initial={{ displayName: user.displayName, email: user.email, role: user.role, overrides: user.permissionOverrides, placeAccess: user.placeAccesses.map((access) => ({ placeId: access.placeId, permissions: access.permissions })) }} /></div>;
}

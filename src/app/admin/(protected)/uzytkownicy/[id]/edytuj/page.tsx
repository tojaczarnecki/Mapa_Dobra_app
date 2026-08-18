import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { updateAdminUser } from "@/app/admin/(protected)/uzytkownicy/actions";
import { UserForm } from "@/components/admin/users/user-form";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

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
  return <div className="space-y-5"><Link href={`/admin/uzytkownicy/${user.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} />Wróć do użytkownika</Link><header><p className="text-sm font-bold text-brand-strong">Konto i dostęp</p><h1 className="mt-1 text-3xl font-bold">Edytuj użytkownika</h1></header><UserForm action={updateAdminUser.bind(null, user.id)} places={places} initial={{ displayName: user.displayName, email: user.email, role: user.role, overrides: user.permissionOverrides, placeAccess: user.placeAccesses.map((access) => ({ placeId: access.placeId, permissions: access.permissions })) }} /></div>;
}

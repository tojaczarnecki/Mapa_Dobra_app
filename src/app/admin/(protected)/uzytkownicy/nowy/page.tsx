import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createAdminUser } from "@/app/admin/(protected)/uzytkownicy/actions";
import { UserForm } from "@/components/admin/users/user-form";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export default async function NewUserPage() {
  await requirePermission("MANAGE_USERS");
  const placeRows = await prisma.place.findMany({ select: { id: true, name: true, addressLine: true, recordKind: true, accommodation: { select: { id: true } } }, orderBy: { name: "asc" } });
  const places = placeRows.map(({ accommodation, ...place }) => ({
    ...place,
    isAccommodation: Boolean(accommodation),
  }));
  return <div className="space-y-5"><Link href="/admin/uzytkownicy" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} />Wróć do użytkowników</Link><header><p className="text-sm font-bold text-brand-strong">Bezpieczne zaproszenie</p><h1 className="mt-1 text-3xl font-bold">Nowy użytkownik</h1></header><UserForm action={createAdminUser} places={places} /></div>;
}

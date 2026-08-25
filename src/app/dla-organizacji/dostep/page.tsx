import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { PlaceAccessForm } from "@/components/organizations/place-access-form";

export default async function OrganizationAccessPage({ searchParams }: { searchParams: Promise<{ place?: string }> }) {
  const { place: placeId } = await searchParams;
  const session = await getCurrentAdmin();
  if (!session) redirect(`/admin/login?next=${encodeURIComponent(`/dla-organizacji/dostep?place=${placeId ?? ""}`)}`);
  const place = placeId ? await prisma.place.findUnique({ where: { id: placeId }, select: { id: true, name: true, addressLine: true } }) : null;
  if (!place) return <main className="mx-auto max-w-xl px-4 py-16"><h1 className="text-2xl font-bold">Nie znaleziono placówki</h1></main>;
  return <main className="mx-auto max-w-xl px-4 py-12 sm:py-20"><p className="text-sm font-bold text-brand-strong">Dla organizacji</p><h1 className="mt-2 text-3xl font-bold">Poproś o dostęp do zarządzania</h1><p className="mt-4 text-base leading-7">Chcesz zarządzać informacjami o: <strong>{place.name}</strong>?</p><p className="mt-1 text-sm text-muted-foreground">{place.addressLine}</p><PlaceAccessForm placeId={place.id} /></main>;
}

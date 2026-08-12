import { AccommodationWizard } from "@/components/accommodations/accommodation-wizard";
import { getPublicAccommodations } from "@/lib/places/public-data";

export const dynamic = "force-dynamic";

export default async function FindAccommodationPage() {
  const accommodations = await getPublicAccommodations();
  return <AccommodationWizard accommodations={accommodations} />;
}

import type { Metadata } from "next";
import { SavedPlacesPage } from "@/components/saved/saved-places-page";

export const metadata: Metadata = {
  title: "Zapisane miejsca | Mapa Dobra",
  description: "Miejsca pomocy zapisane na tym urządzeniu.",
};

export default function SavedPage() {
  return <SavedPlacesPage />;
}

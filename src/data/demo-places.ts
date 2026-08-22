import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Droplets,
  HeartPulse,
  Scale,
  ShowerHead,
  Utensils,
} from "lucide-react";

export type PlaceStatus =
  | "open"
  | "closed"
  | "openToday"
  | "unknownHours"
  | "needsConfirmation";

export type PlaceAction = "call" | "route" | "details";

export type DemoPlace = {
  id: string;
  categorySlug: string;
  slug: string;
  name: string;
  helpTypes: string[];
  status: PlaceStatus;
  todayHours: string;
  distance: string;
  address: string;
  conditions: string[];
  freshness: string;
  freshnessWarning?: boolean;
  phone?: string;
  primaryIcon: LucideIcon;
  latitude?: number;
  longitude?: number;
};

// Dane demonstracyjne do zaprojektowania UX/UI ekranu wyników.
// Nie są podłączone do bazy danych, API ani finalnej logiki rankingowej.
export const demoPlaces: DemoPlace[] = [
  {
    id: "punkt-dobrego-posilku",
    categorySlug: "jedzenie",
    slug: "punkt-dobrego-posilku",
    name: "Punkt Dobrego Posiłku",
    helpTypes: ["Jedzenie", "Higiena"],
    status: "open",
    todayHours: "Dzisiaj 12:00-18:00",
    distance: "750 m",
    address: "ul. Przykładowa 10, Łódź",
    conditions: ["Bez skierowania", "Bez dokumentów"],
    freshness: "Zweryfikowano 2 dni temu",
    phone: "+48123123123",
    primaryIcon: Utensils,
    latitude: 51.7612,
    longitude: 19.4551,
  },
  {
    id: "nocleg-na-dzis",
    categorySlug: "nocleg",
    slug: "nocleg-na-dzis",
    name: "Nocleg na Dziś",
    helpTypes: ["Nocleg"],
    status: "openToday",
    todayHours: "Dzisiaj od 19:00",
    distance: "1,2 km",
    address: "ul. Schronienia 4, Łódź",
    conditions: ["Wymagany kontakt telefoniczny", "Bez dokumentów"],
    freshness: "Zweryfikowano dzisiaj",
    phone: "+48123456789",
    primaryIcon: BedDouble,
    latitude: 51.7587,
    longitude: 19.4489,
  },
  {
    id: "centrum-prysznic-i-pranie",
    categorySlug: "higiena",
    slug: "centrum-prysznic-i-pranie",
    name: "Centrum Prysznic i Pranie",
    helpTypes: ["Prysznic", "Higiena", "Odzież"],
    status: "closed",
    todayHours: "Dzisiaj 8:00-14:00",
    distance: "1,8 km",
    address: "ul. Wspólna 22, Łódź",
    conditions: ["Bez skierowania", "Limit miejsc dziennie"],
    freshness: "Zweryfikowano 5 dni temu",
    primaryIcon: ShowerHead,
    latitude: 51.7621,
    longitude: 19.457,
  },
  {
    id: "punkt-medyczny",
    categorySlug: "pomoc-medyczna",
    slug: "punkt-medyczny",
    name: "Punkt Pomocy Medycznej",
    helpTypes: ["Pomoc medyczna"],
    status: "open",
    todayHours: "Dzisiaj 10:00-16:00",
    distance: "2,4 km",
    address: "ul. Zdrowa 7, Łódź",
    conditions: ["Bez dokumentów", "Pierwsza pomoc"],
    freshness: "Zweryfikowano 3 dni temu",
    phone: "+48987654321",
    primaryIcon: HeartPulse,
    latitude: 51.7694,
    longitude: 19.4625,
  },
  {
    id: "porady-prawne",
    categorySlug: "pomoc-prawna",
    slug: "porady-prawne",
    name: "Porady Prawne Bez Barier",
    helpTypes: ["Pomoc prawna"],
    status: "openToday",
    todayHours: "Dzisiaj 15:00-19:00",
    distance: "3,1 km",
    address: "ul. Spokojna 3, Łódź",
    conditions: ["Wymagane skierowanie", "Zapisy na miejscu"],
    freshness: "Zweryfikowano 9 dni temu",
    primaryIcon: Scale,
    latitude: 51.7518,
    longitude: 19.4686,
  },
  {
    id: "jadlodajnia-stara",
    categorySlug: "jedzenie",
    slug: "jadlodajnia-stara",
    name: "Jadłodajnia Sąsiedzka",
    helpTypes: ["Jedzenie"],
    status: "needsConfirmation",
    todayHours: "Godziny wymagają potwierdzenia",
    distance: "4,6 km",
    address: "ul. Długa 18, Łódź",
    conditions: ["Bez skierowania"],
    freshness: "Dane wymagają potwierdzenia",
    freshnessWarning: true,
    primaryIcon: Utensils,
    latitude: 51.7781,
    longitude: 19.4447,
  },
  {
    id: "punkt-higieny-mobilny",
    categorySlug: "higiena",
    slug: "punkt-higieny-mobilny",
    name: "Mobilny Punkt Higieny",
    helpTypes: ["Higiena", "Prysznic"],
    status: "unknownHours",
    todayHours: "Brak potwierdzonych godzin",
    distance: "5,3 km",
    address: "okolice ul. Centralnej, Łódź",
    conditions: ["Bez dokumentów", "Dostępność zależna od dnia"],
    freshness: "Zweryfikowano 14 dni temu",
    freshnessWarning: true,
    primaryIcon: Droplets,
    latitude: 51.7438,
    longitude: 19.4512,
  },
];

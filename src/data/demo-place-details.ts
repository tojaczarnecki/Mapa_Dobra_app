import {
  demoAccommodations,
  type AccommodationAvailabilityState,
} from "@/data/demo-accommodations";
import type { InformationState } from "@/lib/accommodations/types";
import { demoPlaces } from "@/data/demo-places";

export type DetailTone = "positive" | "warning" | "neutral" | "unknown";

export type OpeningDay = {
  day: string;
  periods?: string[];
  isToday?: boolean;
  status: "open" | "closed" | "unknown";
  note?: string;
};

export type DetailListItem = {
  label: string;
  status: DetailTone;
  note?: string;
};

export type ContactDetails = {
  phone?: string;
  email?: string;
  website?: string;
  social?: string;
  socialLinks?: Array<{ platform: string; url: string; label?: string }>;
};

export type VerificationDetails = {
  label: string;
  tone: "verified" | "needsConfirmation";
  note: string;
};

export type PlaceStatusDetails = {
  label: string;
  tone: "open" | "closed" | "openToday" | "unknown";
  todayHours: string;
  note?: string;
};

export type CapacityGroupDetails = {
  label: string;
  free?: number;
  total?: number;
  note?: string;
};

export type AccommodationAvailabilityDetails = {
  state: "available" | "few" | "full" | "unknown" | "stale" | "suspended";
  label: string;
  confirmed: string;
  note?: string;
};

export type AccommodationDetails = {
  availability: AccommodationAvailabilityDetails;
  admissionsToday: string;
  capacityGroups: CapacityGroupDetails[];
  audience: string[];
  admissionRequirements: DetailListItem[];
  sobriety: DetailListItem;
  animals: DetailListItem[];
  accessibility: DetailListItem[];
  overnightInfo: Array<{
    label: string;
    value: string;
  }>;
  importantNote: string;
};

export type PlaceDetail = {
  id: string;
  citySlug: "lodz";
  categorySlug: string;
  slug: string;
  variant: "standard" | "accommodation";
  name: string;
  typeLabel: string;
  helpTypes: string[];
  status: PlaceStatusDetails;
  distanceLabel: string;
  address: string;
  latitude?: number;
  longitude?: number;
  coordinatesLabel?: string;
  requirements: DetailListItem[];
  audience: string[];
  services: string[];
  accessibility: DetailListItem[];
  description: string[];
  contact: ContactDetails;
  openingHours: OpeningDay[];
  verification: VerificationDetails;
  accommodation?: AccommodationDetails;
};

const sharedWeek: OpeningDay[] = [
  { day: "Poniedziałek", status: "open", periods: ["12:00-18:00"] },
  { day: "Wtorek", status: "open", periods: ["12:00-18:00"], isToday: true },
  { day: "Środa", status: "open", periods: ["10:00-13:00", "15:00-18:00"] },
  { day: "Czwartek", status: "open", periods: ["12:00-18:00"] },
  { day: "Piątek", status: "open", periods: ["12:00-18:00"] },
  { day: "Sobota", status: "unknown", note: "Brak potwierdzonych danych" },
  { day: "Niedziela", status: "closed" },
];

const accommodationWeek: OpeningDay[] = [
  { day: "Poniedziałek", status: "open", periods: ["18:00-22:00"] },
  { day: "Wtorek", status: "open", periods: ["18:00-22:00"], isToday: true },
  { day: "Środa", status: "open", periods: ["18:00-22:00"] },
  { day: "Czwartek", status: "open", periods: ["18:00-22:00"] },
  { day: "Piątek", status: "open", periods: ["18:00-22:00"] },
  { day: "Sobota", status: "open", periods: ["18:00-21:00"] },
  { day: "Niedziela", status: "open", periods: ["18:00-21:00"] },
];

const standardPlace: PlaceDetail = {
  id: "punkt-dobrego-posilku",
  citySlug: "lodz",
  categorySlug: "jedzenie",
  slug: "punkt-dobrego-posilku",
  variant: "standard",
  name: "Punkt Dobrego Posiłku",
  typeLabel: "Punkt pomocy",
  helpTypes: ["Jedzenie", "Higiena"],
  status: {
    label: "OTWARTE",
    tone: "open",
    todayHours: "Dzisiaj 12:00-18:00",
  },
  distanceLabel: "750 m od Ciebie",
  address: "ul. Przykładowa 10, Łódź",
  coordinatesLabel: "Łódź, Śródmieście",
  requirements: [
    { label: "Bez skierowania", status: "positive" },
    { label: "Dokument niewymagany", status: "positive" },
    { label: "Bezpłatnie", status: "positive" },
    { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
  ],
  audience: [
    "osoby w kryzysie bezdomności",
    "osoby w trudnej sytuacji finansowej",
    "seniorzy",
    "migranci",
  ],
  services: [
    "ciepły posiłek",
    "środki higieniczne",
    "toaleta",
    "ładowanie telefonu",
    "pomoc socjalna",
  ],
  accessibility: [
    { label: "Wejście bez stopni", status: "positive" },
    { label: "Toaleta dostępna", status: "unknown", note: "Brak potwierdzonej informacji" },
    { label: "Możliwość wejścia z psem asystującym", status: "unknown", note: "Brak danych" },
  ],
  description: [
    "Punkt wydaje ciepłe posiłki i podstawowe środki higieniczne osobom, które potrzebują bieżącego wsparcia.",
    "Na miejscu można krótko porozmawiać z pracownikiem socjalnym i zapytać o dalszą pomoc w mieście.",
  ],
  contact: {
    phone: "+48123123123",
    email: "kontakt@punktposilku.example",
    website: "https://example.org/punkt-posilku",
  },
  openingHours: sharedWeek,
  verification: {
    label: "Dane zweryfikowane 2 dni temu",
    tone: "verified",
    note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
  },
};

const additionalStandardPlaces: PlaceDetail[] = demoPlaces
  .filter((place) => place.id !== standardPlace.id)
  .map((place) => {
    const statusTone: PlaceStatusDetails["tone"] =
      place.status === "open"
        ? "open"
        : place.status === "closed"
          ? "closed"
          : place.status === "openToday"
            ? "openToday"
            : "unknown";
    const todayStatus: OpeningDay["status"] =
      place.status === "closed"
        ? "closed"
        : place.status === "unknownHours" || place.status === "needsConfirmation"
          ? "unknown"
          : "open";
    const todayPeriod = place.todayHours.replace(/^Dzisiaj\s*/u, "");

    return {
      id: place.id,
      citySlug: "lodz",
      categorySlug: place.categorySlug,
      slug: place.slug,
      variant: "standard",
      name: place.name,
      typeLabel: "Punkt pomocy",
      helpTypes: place.helpTypes,
      status: {
        label:
          place.status === "open"
            ? "OTWARTE"
            : place.status === "closed"
              ? "ZAMKNIĘTE"
              : place.status === "openToday"
                ? "OTWARTE DZISIAJ"
                : "DANE WYMAGAJĄ POTWIERDZENIA",
        tone: statusTone,
        todayHours: place.todayHours,
      },
      distanceLabel: `${place.distance} od Ciebie`,
      address: place.address,
      coordinatesLabel: "Łódź",
      requirements: place.conditions.map((condition) => ({
        label: condition,
        status:
          condition.toLocaleLowerCase("pl-PL").includes("wymagan") ||
          condition.toLocaleLowerCase("pl-PL").includes("limit")
            ? "warning"
            : "positive",
      })),
      audience: ["osoby potrzebujące bieżącego wsparcia"],
      services: place.helpTypes.map((type) => type.toLocaleLowerCase("pl-PL")),
      accessibility: [
        {
          label: "Dostępność nie została potwierdzona",
          status: "unknown",
        },
      ],
      description: [
        "To demonstracyjny rekord miejsca pomocy przygotowany do sprawdzenia działania Mapy Dobra.",
      ],
      contact: { phone: place.phone },
      openingHours: [
        {
          day: "Dzisiaj",
          status: todayStatus,
          periods: todayStatus === "open" ? [todayPeriod] : undefined,
          note: todayStatus === "unknown" ? place.todayHours : undefined,
          isToday: true,
        },
      ],
      verification: {
        label: place.freshness,
        tone: place.freshnessWarning ? "needsConfirmation" : "verified",
        note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
      },
    };
  });

const accommodationBase = {
  citySlug: "lodz" as const,
  categorySlug: "nocleg",
  variant: "accommodation" as const,
  requirements: [
    { label: "Bez skierowania", status: "positive" as const },
    { label: "Dokument niewymagany", status: "positive" as const },
    { label: "Bezpłatnie", status: "positive" as const },
  ],
  services: ["nocleg", "prysznic", "toaleta", "ciepły napój", "pomoc socjalna"],
  description: [
    "Placówka zapewnia miejsce na noc oraz podstawowe wsparcie organizacyjne.",
    "Informacja o wolnych miejscach może się zmienić, dlatego przed przyjazdem warto zadzwonić.",
  ],
  openingHours: accommodationWeek,
  verification: {
    label: "Dane zweryfikowane dzisiaj",
    tone: "verified" as const,
    note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
  },
};

const accommodationPlaces: PlaceDetail[] = [
  {
    ...accommodationBase,
    id: "schronisko-nowy-poczatek",
    slug: "schronisko-nowy-poczatek",
    name: "Schronisko Nowy Początek",
    typeLabel: "Schronisko",
    helpTypes: ["Nocleg"],
    status: {
      label: "OTWARTE DZISIAJ",
      tone: "openToday",
      todayHours: "Przyjęcia dzisiaj do 22:00",
    },
    distanceLabel: "1,4 km od Ciebie",
    address: "ul. Schronienia 4, Łódź",
    contact: {
      phone: "+48123123123",
      email: "kontakt@nowypoczatek.example",
      website: "https://example.org/nowy-poczatek",
    },
    audience: ["dla mężczyzn", "dla osób w kryzysie bezdomności"],
    accessibility: [
      { label: "Miejsce dla osoby na wózku", status: "unknown", note: "Częściowa dostępność" },
      { label: "Prysznic dostępny", status: "unknown", note: "Brak potwierdzenia" },
      { label: "Pies asystujący", status: "positive" },
    ],
    accommodation: {
      availability: {
        state: "available",
        label: "4 wolne miejsca",
        confirmed: "Potwierdzone 35 min temu",
      },
      admissionsToday: "Przyjęcia dzisiaj do 22:00",
      capacityGroups: [{ label: "Mężczyźni", free: 4, total: 40 }],
      audience: ["dla mężczyzn", "dla osób w kryzysie bezdomności"],
      admissionRequirements: [
        { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
        { label: "Bez skierowania", status: "positive" },
        { label: "Dokument niewymagany", status: "positive" },
        { label: "Wymagana trzeźwość", status: "warning" },
        { label: "Zwierzęta po uzgodnieniu", status: "warning" },
      ],
      sobriety: { label: "Wymagana trzeźwość", status: "warning" },
      animals: [
        { label: "Pies po uzgodnieniu", status: "warning" },
        { label: "Pies asystujący", status: "positive" },
      ],
      accessibility: [
        { label: "Miejsce dla osoby na wózku", status: "unknown", note: "Potwierdź telefonicznie" },
        { label: "Dostępna toaleta", status: "unknown", note: "Brak potwierdzonych danych" },
        { label: "Pobyt z asystentem", status: "unknown", note: "Do uzgodnienia" },
      ],
      overnightInfo: [
        { label: "Wyżywienie", value: "ciepły napój rano i wieczorem" },
        { label: "Higiena", value: "prysznic w godzinach dyżuru" },
        { label: "Przechowanie bagażu", value: "szafka na noc" },
        { label: "Godzina powrotu", value: "do 22:00" },
        { label: "Maksymalny czas pobytu", value: "do 3 miesięcy po rozmowie" },
        { label: "Odpłatność", value: "bezpłatnie" },
      ],
      importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
    },
  },
  {
    ...accommodationBase,
    id: "dom-bezpieczna-noc",
    slug: "dom-bezpieczna-noc",
    name: "Dom Bezpieczna Noc",
    typeLabel: "Schronisko",
    helpTypes: ["Nocleg"],
    status: {
      label: "OTWARTE DZISIAJ",
      tone: "openToday",
      todayHours: "Przyjęcia dzisiaj do 21:00",
    },
    distanceLabel: "2,1 km od Ciebie",
    address: "ul. Cicha 12, Łódź",
    contact: { phone: "+48123456789" },
    audience: ["dla kobiet", "dla kobiet w kryzysie"],
    accessibility: [{ label: "Dostępność nie została potwierdzona", status: "unknown" }],
    accommodation: {
      availability: {
        state: "few",
        label: "1 wolne miejsce",
        confirmed: "Potwierdzone 20 min temu",
        note: "Zadzwoń przed przyjazdem, miejsce może szybko przestać być dostępne.",
      },
      admissionsToday: "Przyjęcia dzisiaj do 21:00",
      capacityGroups: [{ label: "Kobiety", free: 1, total: 20 }],
      audience: ["dla kobiet"],
      admissionRequirements: [
        { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
        { label: "Bez skierowania", status: "positive" },
        { label: "Wymagane 0,0", status: "warning" },
      ],
      sobriety: { label: "Wymagane 0,0", status: "warning" },
      animals: [{ label: "Zwierzęta nieprzyjmowane", status: "warning" }],
      accessibility: [{ label: "Dostępność nie została potwierdzona", status: "unknown" }],
      overnightInfo: [
        { label: "Wyżywienie", value: "kolacja i herbata" },
        { label: "Odpłatność", value: "bezpłatnie" },
      ],
      importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
    },
  },
  {
    ...accommodationBase,
    id: "wspolny-dom-rodzin",
    slug: "wspolny-dom-rodzin",
    name: "Wspólny Dom Rodzin",
    typeLabel: "Hostel interwencyjny",
    helpTypes: ["Nocleg", "Pomoc socjalna"],
    status: {
      label: "DANE WYMAGAJĄ POTWIERDZENIA",
      tone: "unknown",
      todayHours: "Przyjęcia dzisiaj do 20:00",
    },
    distanceLabel: "2,8 km od Ciebie",
    address: "ul. Rodzinna 8, Łódź",
    contact: { phone: "+48555123123" },
    audience: ["dla rodzin", "dla kobiet z dziećmi"],
    accessibility: [
      { label: "Podjazd", status: "positive" },
      { label: "Winda", status: "unknown", note: "Brak potwierdzenia" },
    ],
    verification: {
      label: "Dane wymagają potwierdzenia",
      tone: "needsConfirmation",
      note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
    },
    accommodation: {
      availability: {
        state: "stale",
        label: "Ostatnio zgłoszono 3 wolne miejsca",
        confirmed: "Dane sprzed 18 godzin",
        note: "Zadzwoń przed przyjazdem. Te dane mogą być już nieaktualne.",
      },
      admissionsToday: "Przyjęcia dzisiaj do 20:00",
      capacityGroups: [
        { label: "Kobiety z dziećmi", free: 1, total: 10 },
        { label: "Rodziny", free: 2, total: 12 },
      ],
      audience: ["dla kobiet z dziećmi", "dla rodzin"],
      admissionRequirements: [
        { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
        { label: "Wymagane skierowanie", status: "warning" },
        { label: "Dokument niewymagany", status: "positive" },
      ],
      sobriety: { label: "Przyjęcie po indywidualnej ocenie", status: "warning" },
      animals: [{ label: "Brak danych o zwierzętach", status: "unknown" }],
      accessibility: [
        { label: "Podjazd", status: "positive" },
        { label: "Dostępna toaleta", status: "unknown", note: "Potwierdź telefonicznie" },
      ],
      overnightInfo: [
        { label: "Wyżywienie", value: "we własnym zakresie" },
        { label: "Maksymalny czas pobytu", value: "ustalany indywidualnie" },
      ],
      importantNote: "Stare dane nie są gwarancją przyjęcia.",
    },
  },
  {
    ...accommodationBase,
    id: "nocleg-koedukacyjny-przystan",
    slug: "nocleg-koedukacyjny-przystan",
    name: "Nocleg Koedukacyjny Przystań",
    typeLabel: "Noclegownia",
    helpTypes: ["Nocleg"],
    status: {
      label: "BRAK MIEJSC",
      tone: "closed",
      todayHours: "Brak przyjęć bez wolnych miejsc",
    },
    distanceLabel: "900 m od Ciebie",
    address: "ul. Przystani 2, Łódź",
    contact: { phone: "+48222123123" },
    audience: ["koedukacyjne", "dla kobiet", "dla mężczyzn"],
    accessibility: [{ label: "Brak dostępności dla wózka", status: "warning" }],
    accommodation: {
      availability: {
        state: "full",
        label: "Brak miejsc",
        confirmed: "Potwierdzone 10 min temu",
      },
      admissionsToday: "Brak przyjęć bez wolnych miejsc",
      capacityGroups: [
        { label: "Mężczyźni", free: 0, total: 40 },
        { label: "Kobiety", free: 0, total: 20 },
      ],
      audience: ["koedukacyjne", "dla kobiet", "dla mężczyzn"],
      admissionRequirements: [
        { label: "Wymagany ostatni meldunek w Łodzi", status: "warning" },
        { label: "Bez skierowania", status: "positive" },
        { label: "Wymagany dokument", status: "warning" },
      ],
      sobriety: { label: "Osobna procedura dla osób po spożyciu", status: "warning" },
      animals: [{ label: "Pies asystujący", status: "positive" }],
      accessibility: [{ label: "Brak dostępności dla wózka", status: "warning" }],
      overnightInfo: [
        { label: "Godzina powrotu", value: "do 21:30" },
        { label: "Odpłatność", value: "bezpłatnie" },
      ],
      importantNote: "Brak miejsc oznacza, że trzeba zadzwonić i zapytać o inne możliwości.",
    },
  },
  {
    ...accommodationBase,
    id: "punkt-noclegowy-polaczenie",
    slug: "punkt-noclegowy-polaczenie",
    name: "Punkt Noclegowy Połączenie",
    typeLabel: "Punkt noclegowy",
    helpTypes: ["Nocleg"],
    status: {
      label: "BRAK AKTUALNYCH DANYCH",
      tone: "unknown",
      todayHours: "Przyjęcia zwykle do 21:30",
    },
    distanceLabel: "1,7 km od Ciebie",
    address: "ul. Łączna 5, Łódź",
    contact: { phone: "+48444123123" },
    audience: ["koedukacyjne", "dla dorosłych"],
    accessibility: [{ label: "Dostępność nie została potwierdzona", status: "unknown" }],
    verification: {
      label: "Dane wymagają potwierdzenia",
      tone: "needsConfirmation",
      note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
    },
    accommodation: {
      availability: {
        state: "unknown",
        label: "Brak aktualnych danych",
        confirmed: "Ostatnia weryfikacja wczoraj",
        note: "Nie traktuj tego jako potwierdzenia miejsca. Zadzwoń przed przyjazdem.",
      },
      admissionsToday: "Przyjęcia zwykle do 21:30",
      capacityGroups: [{ label: "Dorośli", note: "Brak aktualnych danych" }],
      audience: ["koedukacyjne"],
      admissionRequirements: [
        { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
        { label: "Bez skierowania", status: "positive" },
        { label: "Dokument niewymagany", status: "positive" },
      ],
      sobriety: { label: "Brak potwierdzonych danych", status: "unknown" },
      animals: [{ label: "Po uzgodnieniu", status: "warning" }],
      accessibility: [{ label: "Dostępność nie została potwierdzona", status: "unknown" }],
      overnightInfo: [{ label: "Odpłatność", value: "brak potwierdzonych danych" }],
      importantNote: "Brak aktualnych danych nie oznacza braku miejsc.",
    },
  },
  {
    ...accommodationBase,
    id: "ogrzewalnia-krotki-postoj",
    slug: "ogrzewalnia-krotki-postoj",
    name: "Ogrzewalnia Krótki Postój",
    typeLabel: "Ogrzewalnia",
    helpTypes: ["Nocleg", "Ogrzanie"],
    status: {
      label: "PRZYJĘCIA WSTRZYMANE",
      tone: "closed",
      todayHours: "Przyjęcia czasowo wstrzymane",
    },
    distanceLabel: "1,1 km od Ciebie",
    address: "ul. Krótka 14, Łódź",
    contact: { phone: "+48333123123" },
    audience: ["koedukacyjne", "dla dorosłych"],
    accessibility: [{ label: "Brak danych o dostępności", status: "unknown" }],
    accommodation: {
      availability: {
        state: "suspended",
        label: "Przyjęcia czasowo wstrzymane",
        confirmed: "Aktualizacja 40 min temu",
        note: "Placówka prosi o kontakt telefoniczny w nagłych sytuacjach.",
      },
      admissionsToday: "Przyjęcia czasowo wstrzymane",
      capacityGroups: [{ label: "Dorośli", note: "Przyjęcia wstrzymane" }],
      audience: ["koedukacyjne", "dla dorosłych"],
      admissionRequirements: [
        { label: "Ostatnie zameldowanie w Łodzi niewymagane", status: "positive" },
        { label: "Bez skierowania", status: "positive" },
        { label: "Dokument niewymagany", status: "positive" },
      ],
      sobriety: { label: "Wymagana trzeźwość", status: "warning" },
      animals: [{ label: "Nieprzyjmowane", status: "warning" }],
      accessibility: [{ label: "Brak danych o dostępności", status: "unknown" }],
      overnightInfo: [{ label: "Higiena", value: "brak potwierdzonych danych" }],
      importantNote: "Przyjęcia są czasowo wstrzymane. Zadzwoń, jeśli sytuacja jest pilna.",
    },
  },
];

const fallbackAccommodationAddresses: Record<string, string> = {
  "hostel-interwencyjny-dostepny": "ul. Dostępna 6, Łódź",
  "schronisko-z-opieka": "ul. Opiekuńcza 9, Łódź",
};

const accommodationStatusConfig: Record<
  AccommodationAvailabilityState,
  {
    detailState: AccommodationAvailabilityDetails["state"];
    statusLabel: string;
    statusTone: PlaceStatusDetails["tone"];
  }
> = {
  fresh: {
    detailState: "available",
    statusLabel: "OTWARTE DZISIAJ",
    statusTone: "openToday",
  },
  few: {
    detailState: "few",
    statusLabel: "NIEWIELE MIEJSC",
    statusTone: "openToday",
  },
  none: {
    detailState: "full",
    statusLabel: "BRAK MIEJSC",
    statusTone: "closed",
  },
  unknown: {
    detailState: "unknown",
    statusLabel: "BRAK AKTUALNYCH DANYCH",
    statusTone: "unknown",
  },
  stale: {
    detailState: "stale",
    statusLabel: "DANE WYMAGAJĄ POTWIERDZENIA",
    statusTone: "unknown",
  },
  suspended: {
    detailState: "suspended",
    statusLabel: "PRZYJĘCIA WSTRZYMANE",
    statusTone: "closed",
  },
};

const detailedAccommodationIds = new Set(
  accommodationPlaces.map((place) => place.id),
);

function demoRequirement(
  state: InformationState,
  requiredLabel: string,
  notRequiredLabel: string,
  unknownLabel: string,
): DetailListItem {
  if (state === "YES") return { label: requiredLabel, status: "warning" };
  if (state === "NO") return { label: notRequiredLabel, status: "positive" };
  return { label: unknownLabel, status: "unknown" };
}

const additionalAccommodationPlaces: PlaceDetail[] = demoAccommodations
  .filter((place) => !detailedAccommodationIds.has(place.id))
  .map((place) => {
    const statusConfig = accommodationStatusConfig[place.availability.state];
    const accessibility: DetailListItem[] = [
      place.accessibility === "YES"
        ? { label: "Miejsce dla osoby na wózku", status: "positive" }
        : place.accessibility === "NO"
          ? { label: "Brak dostępności dla wózka", status: "warning" }
          : {
              label: "Dostępność dla osoby na wózku wymaga potwierdzenia",
              status: "unknown",
            },
    ];
    const admissionRequirements: DetailListItem[] = [
      demoRequirement(
        place.lodzRegistrationRequired,
        "Wymagany ostatni meldunek w Łodzi",
        "Ostatnie zameldowanie w Łodzi niewymagane",
        "Wymóg ostatniego meldunku wymaga potwierdzenia",
      ),
      demoRequirement(
        place.referralRequired,
        "Wymagane skierowanie",
        "Bez skierowania",
        "Wymóg skierowania wymaga potwierdzenia",
      ),
      demoRequirement(
        place.documentRequired,
        "Wymagany dokument",
        "Dokument niewymagany",
        "Wymóg dokumentu wymaga potwierdzenia",
      ),
      {
        label: place.sobrietyRule,
        status: place.sobrietyPolicy === "UNKNOWN" ? "unknown" : "warning",
      },
    ];

    return {
      ...accommodationBase,
      id: place.id,
      slug: place.slug,
      name: place.name,
      typeLabel: place.typeLabel,
      helpTypes: ["Nocleg"],
      status: {
        label: statusConfig.statusLabel,
        tone: statusConfig.statusTone,
        todayHours: place.admissionsToday,
      },
      distanceLabel: `${place.distanceLabel} od Ciebie`,
      address: fallbackAccommodationAddresses[place.id] ?? "Łódź",
      contact: { phone: place.phone },
      requirements: admissionRequirements,
      audience: [place.audienceLabel],
      accessibility,
      verification: {
        label: place.availability.confirmed,
        tone:
          place.availability.state === "unknown" ||
          place.availability.state === "stale"
            ? "needsConfirmation"
            : "verified",
        note: "Informacje w Mapie Dobra są regularnie aktualizowane.",
      },
      accommodation: {
        availability: {
          state: statusConfig.detailState,
          label: place.availability.label,
          confirmed: place.availability.confirmed,
          note: place.availability.note,
        },
        admissionsToday: place.admissionsToday,
        capacityGroups: [
          typeof place.availability.freePlaces === "number"
            ? {
                label: place.audienceLabel,
                free: place.availability.freePlaces,
              }
            : { label: place.audienceLabel, note: "Brak aktualnych danych" },
        ],
        audience: [place.audienceLabel],
        admissionRequirements,
        sobriety: { label: place.sobrietyRule, status: "warning" },
        animals: [
          {
            label: ({
              ACCEPTED: "Przyjmowane",
              NOT_ACCEPTED: "Nieprzyjmowane",
              DOG_ONLY: "Przyjmowany tylko pies",
              BY_ARRANGEMENT: "Po uzgodnieniu",
              ASSISTANCE_DOG_ONLY: "Przyjmowany pies asystujący",
              UNKNOWN: "Brak potwierdzonych danych",
            } as const)[place.petPolicy],
            status:
              place.petPolicy === "UNKNOWN"
                ? "unknown"
                : place.petPolicy === "NOT_ACCEPTED"
                  ? "warning"
                  : "neutral",
          },
        ],
        accessibility,
        overnightInfo: place.careServices === "YES"
          ? [{ label: "Usługi opiekuńcze", value: "dostępne na miejscu" }]
          : place.careServices === "UNKNOWN"
            ? [{ label: "Usługi opiekuńcze", value: "wymagają potwierdzenia" }]
          : [],
        importantNote:
          place.availability.note ??
          "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
      },
    };
  });

export const demoPlaceDetails: PlaceDetail[] = [
  standardPlace,
  ...additionalStandardPlaces,
  ...accommodationPlaces,
  ...additionalAccommodationPlaces,
];

export function getDemoPlaceDetail(categorySlug: string, slug: string) {
  return demoPlaceDetails.find(
    (place) => place.categorySlug === categorySlug && place.slug === slug,
  );
}

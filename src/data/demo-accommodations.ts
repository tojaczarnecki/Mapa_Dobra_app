export type AccommodationProfile =
  | "woman"
  | "man"
  | "womanWithChildren"
  | "family"
  | "disability"
  | "other";

export type WheelchairNeed = "yes" | "no" | "unknown";
export type RegistrationAnswer = "yes" | "no" | "unknown";
export type PetAnswer = "none" | "dog" | "other";

export type AccommodationNeed =
  | "noReferral"
  | "noDocuments"
  | "careServices"
  | "partialDependency";

export type AccommodationAvailabilityState =
  | "fresh"
  | "few"
  | "none"
  | "unknown"
  | "stale"
  | "suspended";

export type Accommodation = {
  id: string;
  categorySlug: "nocleg";
  slug: string;
  name: string;
  typeLabel: string;
  audienceLabel: string;
  acceptedProfiles: AccommodationProfile[];
  availability: {
    state: AccommodationAvailabilityState;
    freePlaces?: number;
    label: string;
    confirmed: string;
    note?: string;
  };
  acceptsToday: boolean;
  admissionsToday: string;
  lodzRegistrationRequired: boolean;
  referralRequired: boolean;
  documentRequired: boolean;
  sobrietyRule: string;
  petPolicy: "none" | "dogByArrangement" | "byArrangement";
  accessibility: "yes" | "partial" | "no";
  careServices: boolean;
  partialDependencySupport: boolean;
  distanceKm: number;
  distanceLabel: string;
  phone?: string;
  latitude: number;
  longitude: number;
};

// Dane demonstracyjne do zaprojektowania UX/UI kreatora noclegu.
// Nie są podłączone do bazy danych, API, synchronizacji łóżek ani finalnego rankingu.
export const demoAccommodations: Accommodation[] = [
  {
    id: "schronisko-nowy-poczatek",
    categorySlug: "nocleg",
    slug: "schronisko-nowy-poczatek",
    name: "Schronisko Nowy Początek",
    typeLabel: "Schronisko",
    audienceLabel: "dla mężczyzn",
    acceptedProfiles: ["man", "other"],
    availability: {
      state: "fresh",
      freePlaces: 4,
      label: "4 wolne miejsca",
      confirmed: "Potwierdzone 35 min temu",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia dzisiaj do 22:00",
    lodzRegistrationRequired: false,
    referralRequired: false,
    documentRequired: false,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "dogByArrangement",
    accessibility: "partial",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 1.4,
    distanceLabel: "1,4 km",
    phone: "+48123123123",
    latitude: 51.7584,
    longitude: 19.4497,
  },
  {
    id: "dom-bezpieczna-noc",
    categorySlug: "nocleg",
    slug: "dom-bezpieczna-noc",
    name: "Dom Bezpieczna Noc",
    typeLabel: "Schronisko",
    audienceLabel: "dla kobiet",
    acceptedProfiles: ["woman", "other"],
    availability: {
      state: "few",
      freePlaces: 1,
      label: "1 wolne miejsce",
      confirmed: "Potwierdzone 20 min temu",
      note: "Zadzwoń przed przyjazdem, miejsce może szybko przestać być dostępne.",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia dzisiaj do 21:00",
    lodzRegistrationRequired: false,
    referralRequired: false,
    documentRequired: false,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "none",
    accessibility: "no",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 2.1,
    distanceLabel: "2,1 km",
    phone: "+48123456789",
    latitude: 51.7548,
    longitude: 19.4371,
  },
  {
    id: "wspolny-dom-rodzin",
    categorySlug: "nocleg",
    slug: "wspolny-dom-rodzin",
    name: "Wspólny Dom Rodzin",
    typeLabel: "Hostel interwencyjny",
    audienceLabel: "dla rodzin i kobiet z dziećmi",
    acceptedProfiles: ["womanWithChildren", "family"],
    availability: {
      state: "stale",
      freePlaces: 3,
      label: "Ostatnio zgłoszono 3 wolne miejsca",
      confirmed: "Dane sprzed 14 godzin",
      note: "Dane mogą być już nieaktualne. Zadzwoń przed przyjazdem.",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia dzisiaj do 20:00",
    lodzRegistrationRequired: false,
    referralRequired: true,
    documentRequired: false,
    sobrietyRule: "Rozmowa na miejscu",
    petPolicy: "none",
    accessibility: "partial",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 2.8,
    distanceLabel: "2,8 km",
    phone: "+48555123123",
    latitude: 51.7462,
    longitude: 19.4704,
  },
  {
    id: "nocleg-koedukacyjny-przystan",
    categorySlug: "nocleg",
    slug: "nocleg-koedukacyjny-przystan",
    name: "Nocleg Koedukacyjny Przystań",
    typeLabel: "Noclegownia",
    audienceLabel: "koedukacyjna",
    acceptedProfiles: ["woman", "man", "other"],
    availability: {
      state: "none",
      label: "Brak miejsc",
      confirmed: "Potwierdzone 10 min temu",
    },
    acceptsToday: false,
    admissionsToday: "Brak przyjęć bez wolnych miejsc",
    lodzRegistrationRequired: true,
    referralRequired: false,
    documentRequired: true,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "none",
    accessibility: "no",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 0.9,
    distanceLabel: "900 m",
    phone: "+48222123123",
    latitude: 51.7591,
    longitude: 19.4505,
  },
  {
    id: "hostel-interwencyjny-dostepny",
    categorySlug: "nocleg",
    slug: "hostel-interwencyjny-dostepny",
    name: "Hostel Interwencyjny Dostępny",
    typeLabel: "Hostel interwencyjny",
    audienceLabel: "dla osób z niepełnosprawnościami",
    acceptedProfiles: ["disability", "woman", "man", "other"],
    availability: {
      state: "fresh",
      freePlaces: 2,
      label: "2 wolne miejsca",
      confirmed: "Potwierdzone 55 min temu",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia dzisiaj do 23:00",
    lodzRegistrationRequired: false,
    referralRequired: false,
    documentRequired: false,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "byArrangement",
    accessibility: "yes",
    careServices: false,
    partialDependencySupport: true,
    distanceKm: 3.6,
    distanceLabel: "3,6 km",
    phone: "+48777123123",
    latitude: 51.7732,
    longitude: 19.4817,
  },
  {
    id: "schronisko-z-opieka",
    categorySlug: "nocleg",
    slug: "schronisko-z-opieka",
    name: "Schronisko z Opieką Spokojny Pokój",
    typeLabel: "Schronisko z usługami opiekuńczymi",
    audienceLabel: "dla osób częściowo niesamodzielnych",
    acceptedProfiles: ["disability", "other"],
    availability: {
      state: "few",
      freePlaces: 1,
      label: "1 wolne miejsce",
      confirmed: "Potwierdzone 2 godziny temu",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia dzisiaj do 18:00",
    lodzRegistrationRequired: true,
    referralRequired: true,
    documentRequired: true,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "none",
    accessibility: "yes",
    careServices: true,
    partialDependencySupport: true,
    distanceKm: 4.3,
    distanceLabel: "4,3 km",
    phone: "+48666123123",
    latitude: 51.7359,
    longitude: 19.4308,
  },
  {
    id: "punkt-noclegowy-polaczenie",
    categorySlug: "nocleg",
    slug: "punkt-noclegowy-polaczenie",
    name: "Punkt Noclegowy Połączenie",
    typeLabel: "Punkt noclegowy",
    audienceLabel: "koedukacyjny",
    acceptedProfiles: ["woman", "man", "other"],
    availability: {
      state: "unknown",
      label: "Brak aktualnych danych",
      confirmed: "Ostatnia weryfikacja wczoraj",
      note: "Nie traktuj tego jako potwierdzenia miejsca. Zadzwoń przed przyjazdem.",
    },
    acceptsToday: true,
    admissionsToday: "Przyjęcia zwykle do 21:30",
    lodzRegistrationRequired: false,
    referralRequired: false,
    documentRequired: false,
    sobrietyRule: "Rozmowa na miejscu",
    petPolicy: "byArrangement",
    accessibility: "partial",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 1.7,
    distanceLabel: "1,7 km",
    phone: "+48444123123",
    latitude: 51.7647,
    longitude: 19.4462,
  },
  {
    id: "ogrzewalnia-krotki-postoj",
    categorySlug: "nocleg",
    slug: "ogrzewalnia-krotki-postoj",
    name: "Ogrzewalnia Krótki Postój",
    typeLabel: "Ogrzewalnia",
    audienceLabel: "dla dorosłych",
    acceptedProfiles: ["woman", "man", "other"],
    availability: {
      state: "suspended",
      label: "Przyjęcia czasowo wstrzymane",
      confirmed: "Aktualizacja 40 min temu",
      note: "Placówka prosi o kontakt telefoniczny w nagłych sytuacjach.",
    },
    acceptsToday: false,
    admissionsToday: "Przyjęcia czasowo wstrzymane",
    lodzRegistrationRequired: false,
    referralRequired: false,
    documentRequired: false,
    sobrietyRule: "Wymagana trzeźwość",
    petPolicy: "none",
    accessibility: "no",
    careServices: false,
    partialDependencySupport: false,
    distanceKm: 1.1,
    distanceLabel: "1,1 km",
    phone: "+48333123123",
    latitude: 51.7576,
    longitude: 19.4521,
  },
];

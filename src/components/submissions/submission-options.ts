import type { HelpCategory, PlaceUpdateType } from "@/types/submissions";

export const updateTypeGroups: Array<{
  label: string;
  options: Array<{ value: PlaceUpdateType; label: string }>;
}> = [
  {
    label: "Dane miejsca",
    options: [
      { value: "hours", label: "Błędne godziny" },
      { value: "address", label: "Błędny adres" },
      { value: "phone", label: "Błędny telefon" },
      { value: "online-contact", label: "Błędny e-mail / strona WWW" },
    ],
  },
  {
    label: "Pomoc i warunki",
    options: [
      { value: "help-scope", label: "Zmienił się zakres pomocy" },
      {
        value: "requirements",
        label: "Zmieniły się warunki skorzystania z pomocy",
      },
      { value: "other", label: "Inny błąd / inna zmiana" },
    ],
  },
  {
    label: "Zamknięcie lub nocleg",
    options: [
      { value: "temporary-closure", label: "Miejsce jest czasowo zamknięte" },
      { value: "permanent-closure", label: "Miejsce zostało zamknięte na stałe" },
      {
        value: "accommodation-availability",
        label: "Informacja o wolnych miejscach jest nieaktualna",
      },
      {
        value: "accommodation-rules",
        label: "Zmieniły się zasady przyjęcia do noclegu",
      },
    ],
  },
];

export const updateSourceOptions = [
  { value: "visited", label: "Byłem/am na miejscu" },
  { value: "staff", label: "Informacja od pracownika placówki" },
  { value: "phone", label: "Rozmowa telefoniczna z placówką" },
  { value: "website", label: "Strona internetowa placówki" },
  { value: "social", label: "Media społecznościowe placówki" },
  { value: "other", label: "Inne" },
  { value: "prefer-not", label: "Wolę nie podawać" },
];

export const helpCategoryOptions: Array<{ value: HelpCategory; label: string }> = [
  { value: "food", label: "Jedzenie" },
  { value: "accommodation", label: "Nocleg" },
  { value: "hygiene", label: "Higiena" },
  { value: "clothing", label: "Odzież" },
  { value: "medical", label: "Pomoc medyczna" },
  { value: "psychological", label: "Pomoc psychologiczna" },
  { value: "legal", label: "Pomoc prawna" },
  { value: "social", label: "Pomoc socjalna" },
  { value: "other", label: "Inna" },
];

export const conditionOptions = [
  "Bez skierowania",
  "Wymagane skierowanie",
  "Dokument niewymagany",
  "Wymagany dokument",
  "Bezpłatnie",
  "Wymagane wcześniejsze umówienie",
  "Ostatnie zameldowanie w Łodzi wymagane",
  "Ostatnie zameldowanie w Łodzi niewymagane",
  "Nie wiem",
];

export const facilityTypeOptions = [
  "Schronisko",
  "Noclegownia",
  "Ogrzewalnia",
  "Hostel",
  "Hostel interwencyjny",
  "Schronisko z usługami opiekuńczymi",
  "Dom dla kobiet z dziećmi",
  "Inne",
  "Nie wiem",
];

export const accommodationAudienceOptions = [
  "Koedukacyjne",
  "Dla kobiet",
  "Dla mężczyzn",
  "Dla kobiet z dziećmi",
  "Dla rodzin",
  "Dla osób z niepełnosprawnościami",
  "Dla osób wymagających usług opiekuńczych",
  "Nie wiem",
];

export const accessibilityOptions = [
  "Wejście bez stopni",
  "Podjazd",
  "Winda",
  "Toaleta dostępna",
  "Prysznic dostępny",
  "Miejsce dla osoby na wózku",
  "Usługi opiekuńcze",
  "Nie wiem",
];

export const newPlaceSourceOptions = [
  { value: "used-help", label: "Korzystałem/am z pomocy" },
  { value: "staff", label: "Pracuję / działam w tej placówce" },
  { value: "volunteer", label: "Jestem wolontariuszem" },
  { value: "website", label: "Informacja ze strony internetowej" },
  { value: "social", label: "Informacja z social media" },
  { value: "recommendation", label: "Polecenie innej osoby" },
  { value: "other", label: "Inne" },
  { value: "prefer-not", label: "Wolę nie podawać" },
];

import { createHash } from "node:crypto";

export const CARITAS_GDZIE_IMPORT = {
  key: "CARITAS_GDZIE_2025_2026",
  title: "Gdzie - zjeść, spać, umyć się, otrzymać wsparcie specjalistów. Przewodnik po Łodzi 2025/2026",
  sourceUrl: "https://caritas.fra1.cdn.digitaloceanspaces.com/uploads/2025/11/GDZIE-przewodnik-po-Lodzi-2025.pdf",
  publisher: "Caritas Archidiecezji Łódzkiej",
  edition: "2025/2026",
  importDate: "2026-08-18",
} as const;

export type SourceEntry = {
  sourceKey: string;
  section: string;
  sourcePages: number[];
  rawName: string;
  rawAddress: string | null;
  rawPhone: string | null;
  rawEmail: string | null;
  rawWebsite: string | null;
  rawOpeningHours: string | null;
  rawAdmissionHours: string | null;
  rawAssistanceDescription: string | null;
  rawText: string;
  categoryHints: string[];
  targetGroupHints: string[];
};

export type CandidateDraft = {
  candidateKey: string;
  sourceKeys: string[];
  sourcePages: number[];
  proposedName: string;
  proposedAddress: string | null;
  proposedPhone: string | null;
  proposedEmail: string | null;
  proposedWebsite: string | null;
  proposedOrganizationName: string | null;
  categorySlugs: string[];
  primaryCategorySlug: string | null;
  reviewReasons: string[];
  proposedData: Record<string, unknown>;
};

type PageLine = { text: string; page: number };

const sectionConfig = [
  { key: "food", label: "Gdzie zjeść", pages: [14, 15, 16, 17], categories: ["jedzenie"], targets: [] },
  { key: "sleep-women", label: "Gdzie spać - kobiety", pages: [25, 26], categories: ["nocleg"], targets: ["Kobiety"] },
  { key: "sleep-men", label: "Gdzie spać - mężczyźni", pages: [29, 30, 31, 32], categories: ["nocleg"], targets: ["Mężczyźni"] },
  { key: "clothing", label: "Gdzie się ubrać", pages: [35, 36, 37], categories: ["odziez"], targets: [] },
  { key: "hygiene", label: "Gdzie się umyć", pages: [41, 42], categories: ["higiena", "prysznic"], targets: [] },
  { key: "medical", label: "Pomoc medyczna", pages: [45], categories: ["pomoc-medyczna"], targets: [] },
  { key: "specialist", label: "Porada specjalisty", pages: [49, 50, 51, 52, 53, 54], categories: [], targets: [] },
  { key: "work", label: "Gdzie szukać pracy", pages: [57, 58], categories: ["pomoc-socjalna"], targets: [] },
  { key: "spiritual", label: "Pomoc duchowa", pages: [60, 61], categories: ["inne"], targets: [] },
] as const;

const supportTitles = [
  "Specjalistyczna Świetlica Środowiskowa Caritas Archidiecezji Łódzkiej",
  "Dom Dziennego Pobytu Caritas Archidiecezji Łódzkiej",
  "Niepubliczny Zakład Opieki Zdrowotnej Caritas Archidiecezji Łódzkiej (Hospicjum Domowe Caritas)",
  "Niepubliczny Zakład Opieki Zdrowotnej Caritas Archidiecezji Łódzkiej Integracyjny Ośrodek Leczeń i Rehabilitacji im. Jana Pawła II",
  "Dom Najświętszego Serca Jezusowego Siostry Misjonarki Miłości",
  "Towarzystwo Pomocy im. św. Alberta. Koło Łódzkie - Świetlica dla bezdomnych",
  "Caritas Archidiecezji Łódzkiej - Punkt Pomocy Charytatywnej ze świetlicą",
  "Stowarzyszenie Promocji Zdrowia i Psychoterapii - Specjalistyczny Ośrodek Wsparcia dla Ofiar Przemocy w Rodzinie",
  "Dom Samotnej Matki im. Stanisławy Leszczyńskiej",
  "Centrum Służby Rodzinie - Fundusz Ochrony Macierzyństwa im. Stanisławy Leszczyńskiej",
  "Centrum Służby Rodzinie - Archidiecezjalny Ośrodek Adopcyjny",
  "Centrum Służby Rodzinie - Świetlica Środowiskowa M.Łodzi Niegniewni",
  "MOPS - Wydział Wspierania Osób w Kryzysie Bezdomności",
  "Stowarzyszenie Samopomocowe ABAKUS",
  "Stowarzyszenie Monar - Poradnia Profilaktyki, Leczenia i Terapii Uzależnień w Łodzi",
  "Miejskie Centrum Terapii i Profilaktyki Zdrowotnej w Łodzi",
  "Fundacja Sarepta - Wrzutka (Bez)Domni Barlicki",
  "Fundacja Sarepta - Wrzutka (Bez)Domni Włókniarzy",
  "Dział Pomocy Pozamaterialnej - MOPS w Łodzi",
] as const;

const supportTitleProbes = [
  "Specjalistyczna Świetlica Środowiskowa Caritas Archidiecezji Łódzkiej",
  "Dom Dziennego Pobytu Caritas Archidiecezji Łódzkiej",
  "Niepubliczny Zakład Opieki Zdrowotnej Caritas Archidiecezji Łódzkiej (Hospicjum Domowe Caritas)",
  "Niepubliczny Zakład Opieki Zdrowotnej Caritas Archidiecezji Łódzkiej Integracyjny Ośrodek Leczeń i Rehabilitacji im. Jana Pawła II",
  "Dom Najświętszego Serca Jezusowego Siostry Misjonarki Miłości",
  "Towarzystwo Pomocy im. św. Alberta. Koło Łódzkie - Świetlica dla bezdomnych",
  "Caritas Archidiecezji Łódzkiej - Punkt Pomocy Charytatywnej ze świetlicą",
  "Stowarzyszenie Promocji Zdrowia i Psychoterapii - Specjalistyczny Ośrodek Wsparcia dla Ofiar Przemocy w Rodzinie",
  "Dom Samotnej Matki im. Stanisławy Leszczyńskiej",
  "Centrum Służby Rodzinie - Fundusz Ochrony Macierzyństwa im. Stanisławy Leszczyńskiej",
  "Centrum Służby Rodzinie - Archidiecezjalny Ośrodek Adopcyjny",
  "Świetlica Środowiskowa „M.Łodzi Niegniewni”",
  "MOPS - Wydział Wspierania Osób w Kryzysie Bezdomności",
  "Stowarzyszenie Samopomocowe „ABAKUS”",
  "Stowarzyszenie Monar - Poradnia Profilaktyki, Leczenia i Terapii Uzależnień w Łodzi",
  "Miejskie Centrum Terapii i Profilaktyki Zdrowotnej w Łodzi",
  "Fundacja Sarepta - Wrzutka (Bez)Domni Barlicki",
  "Fundacja Sarepta - Wrzutka (Bez)Domni Włókniarzy",
  "Dział Pomocy Pozamaterialnej -MOPS w Łodzi",
] as const;

function clean(value: string) {
  return value.replace(/\u0007/g, "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

export function normalizeComparable(value: string) {
  return clean(value)
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugifyImportValue(value: string) {
  return normalizeComparable(value).replace(/\s+/g, "-").replace(/^-|-$/g, "");
}

function pageLines(pages: string[], pageNumbers: readonly number[]) {
  return pageNumbers.flatMap((page) =>
    (pages[page - 1] ?? "")
      .split("\n")
      .map((text) => ({ text: text.replace(/\u0007/g, "").trimEnd(), page }))
      .filter(({ text }) => {
        const value = text.trim();
        if (!value) return false;
        if (/^(?:\d+\s+)?(?:GDZIE|INNE FORMY|INNE PLACÓWKI).*(?:\s+\d+)?$/.test(value)) return false;
        return !/^\d+$/.test(value);
      }),
  );
}

function bulletGroups(lines: PageLine[]) {
  const groups: PageLine[][] = [];
  for (const line of lines) {
    if (/^\s*•/.test(line.text)) groups.push([{ ...line, text: line.text.replace(/^\s*•\s*/, "") }]);
    else if (groups.length) groups.at(-1)!.push(line);
  }
  return groups.map((group) => ({
    text: clean(group.map((line) => line.text).join(" ")),
    pages: [...new Set(group.map((line) => line.page))],
  }));
}

function parseContact(value: string) {
  const email = value.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? null;
  const website = value.match(/(?:https?:\/\/|www\.)\S+/i)?.[0]?.replace(/[),.;]+$/, "") ?? null;
  return { email, website };
}

function sourceEntryFromLines(
  sourceKey: string,
  section: string,
  lines: PageLine[],
  categoryHints: string[],
  targetGroupHints: string[],
): SourceEntry {
  const firstBullet = lines.findIndex((line) => /^\s*•/.test(line.text));
  const nameLines = firstBullet < 0 ? lines : lines.slice(0, firstBullet);
  const rawName = clean(nameLines.map((line) => line.text).join(" "));
  const groups = bulletGroups(lines);
  let rawAddress: string | null = null;
  let rawPhone: string | null = null;
  let rawEmail: string | null = null;
  let rawWebsite: string | null = null;
  let rawOpeningHours: string | null = null;
  let rawAdmissionHours: string | null = null;
  const assistance: string[] = [];

  for (const group of groups) {
    const value = group.text;
    const directAddress = value.match(/^Adres\s*:\s*(.*)$/i);
    const directPhone = value.match(/^Telefon(?:u)?\s*:\s*(.*)$/i);
    const directOpening = value.match(/^Godziny otwarcia\s*:?\s*(.*)$/i);
    const directAdmission = value.match(/^(?:Godziny przyjęć|Prośby o przyjęcie|Przyjmowanie interesantów)\s*:?\s*(.*)$/i);
    if (directAddress) {
      rawAddress = clean(directAddress[1]);
      continue;
    }
    if (directPhone) {
      rawPhone = clean(directPhone[1]);
      continue;
    }
    if (directOpening) {
      rawOpeningHours = clean(directOpening[1]);
      continue;
    }
    if (directAdmission) {
      rawAdmissionHours = clean(directAdmission[1]);
      continue;
    }
    const field = value.match(/^([^:]{2,45}):?\s*(.*)$/);
    const label = normalizeComparable(field?.[1] ?? "");
    const content = clean(field?.[2] ?? value);
    if (label === "adres") rawAddress = content;
    else if (label === "telefon" || label === "telefonu") rawPhone = content;
    else if (label.startsWith("godziny otwarcia")) rawOpeningHours = content;
    else if (label.startsWith("godziny przyjec") || label.startsWith("prosby o przyjecie") || label.startsWith("przyjmowanie interesantow")) rawAdmissionHours = content;
    else if (label === "kontakt" || label.startsWith("zgloszenia i zapisy")) {
      const contact = parseContact(content);
      rawEmail ||= contact.email;
      rawWebsite ||= contact.website;
      if (!contact.email && !contact.website) assistance.push(value);
    } else if (label.startsWith("forma pomocy") || label.startsWith("formy pomocy") || label.startsWith("forma wsparcia") || label.startsWith("formy wsparcia") || label === "zapisy") {
      assistance.push(content);
    } else {
      const contact = parseContact(value);
      rawEmail ||= contact.email;
      rawWebsite ||= contact.website;
      assistance.push(value);
    }
  }

  return {
    sourceKey,
    section,
    sourcePages: [...new Set(lines.map((line) => line.page))],
    rawName,
    rawAddress,
    rawPhone,
    rawEmail,
    rawWebsite,
    rawOpeningHours,
    rawAdmissionHours,
    rawAssistanceDescription: assistance.length ? assistance.join("; ") : null,
    rawText: lines.map((line) => line.text.trim()).join("\n"),
    categoryHints,
    targetGroupHints,
  };
}

function parseNumberedSection(
  pages: string[],
  config: (typeof sectionConfig)[number],
) {
  const lines = pageLines(pages, config.pages);
  const entries: SourceEntry[] = [];
  let current: { number: number; lines: PageLine[] } | null = null;
  for (const line of lines) {
    const marker = line.text.match(/^\s*(\d+)\.\s*(.*)$/);
    if (marker) {
      if (current) {
        entries.push(sourceEntryFromLines(`${config.key}-${current.number}`, config.label, current.lines, [...config.categories], [...config.targets]));
      }
      current = { number: Number(marker[1]), lines: [{ ...line, text: marker[2] }] };
    } else if (current) current.lines.push(line);
  }
  if (current) entries.push(sourceEntryFromLines(`${config.key}-${current.number}`, config.label, current.lines, [...config.categories], [...config.targets]));
  return entries;
}

function parseFridges(pages: string[]) {
  const lines = pageLines(pages, [18, 19, 20]);
  const entries: SourceEntry[] = [];
  let current: { number: number; lines: PageLine[] } | null = null;
  for (const line of lines) {
    const marker = line.text.match(/^\s*(\d+)\.\s*(.*)$/);
    if (marker) {
      if (current) entries.push(fridgeEntry(current.number, current.lines));
      current = { number: Number(marker[1]), lines: [{ ...line, text: marker[2] }] };
    } else if (current) current.lines.push(line);
  }
  if (current) entries.push(fridgeEntry(current.number, current.lines));
  return entries;
}

function fridgeEntry(number: number, lines: PageLine[]): SourceEntry {
  const address = clean(lines[0]?.text ?? "");
  return {
    sourceKey: `fridge-${number}`,
    section: "Lodówki społeczne",
    sourcePages: [...new Set(lines.map((line) => line.page))],
    rawName: `Lodówka społeczna - ${address}`,
    rawAddress: address,
    rawPhone: null,
    rawEmail: null,
    rawWebsite: null,
    rawOpeningHours: "całą dobę",
    rawAdmissionHours: null,
    rawAssistanceDescription: clean(lines.slice(1).map((line) => line.text).join(" ")) || "żywność",
    rawText: lines.map((line) => line.text.trim()).join("\n"),
    categoryHints: ["jedzenie"],
    targetGroupHints: [],
  };
}

function parseFoodShares(pages: string[]) {
  const lines = pageLines(pages, [21]);
  const entries: SourceEntry[] = [];
  let current: { number: number; lines: PageLine[] } | null = null;
  for (const line of lines) {
    const marker = line.text.match(/^\s*(\d+)\.\s*(.*)$/);
    if (marker) {
      if (current) entries.push(foodShareEntry(current.number, current.lines));
      current = { number: Number(marker[1]), lines: [{ ...line, text: marker[2] }] };
    } else if (current) current.lines.push(line);
  }
  if (current) entries.push(foodShareEntry(current.number, current.lines));
  return entries;
}

function foodShareEntry(number: number, lines: PageLine[]): SourceEntry {
  const address = clean(lines[0]?.text ?? "");
  const detail = clean(lines.slice(1).map((line) => line.text).join(" "));
  const hours = detail.match(/czynna?\s+(.+?)(?:\.|$)/i)?.[1] ?? null;
  return {
    sourceKey: `food-share-${number}`,
    section: "Jadłodzielnie",
    sourcePages: [...new Set(lines.map((line) => line.page))],
    rawName: `Jadłodzielnia - ${address.replace(/^ul\.\s*/i, "")}`,
    rawAddress: address,
    rawPhone: null,
    rawEmail: null,
    rawWebsite: null,
    rawOpeningHours: hours,
    rawAdmissionHours: null,
    rawAssistanceDescription: detail || "żywność",
    rawText: lines.map((line) => line.text.trim()).join("\n"),
    categoryHints: ["jedzenie"],
    targetGroupHints: [],
  };
}

function collapsedPageRange(pages: string[], pageNumbers: number[]) {
  let text = "";
  const spans: Array<{ start: number; end: number; page: number }> = [];
  for (const page of pageNumbers) {
    const value = clean(
      pageLines(pages, [page])
        .map((line) => line.text)
        .join(" "),
    );
    const start = text.length;
    text += `${text ? " " : ""}${value}`;
    spans.push({ start, end: text.length, page });
  }
  return { text, spans };
}

function parseFlatSourceEntry(sourceKey: string, section: string, name: string, block: string, pages: number[]): SourceEntry {
  const chunks = block.split(/\s*•\s*/).map(clean).filter(Boolean);
  let rawAddress: string | null = null;
  let rawPhone: string | null = null;
  let rawOpeningHours: string | null = null;
  let rawAdmissionHours: string | null = null;
  let rawEmail: string | null = null;
  let rawWebsite: string | null = null;
  const assistance: string[] = [];
  for (const chunk of chunks.slice(1)) {
    const match = chunk.match(/^([^:]{2,45}):?\s*(.*)$/);
    const label = normalizeComparable(match?.[1] ?? "");
    const value = clean(match?.[2] ?? chunk);
    if (label === "adres") rawAddress = value;
    else if (label === "telefon") rawPhone = value;
    else if (label.startsWith("godziny otwarcia")) rawOpeningHours = value;
    else if (label.startsWith("godziny przyjec")) rawAdmissionHours = value;
    else {
      const contact = parseContact(value);
      rawEmail ||= contact.email;
      rawWebsite ||= contact.website;
      assistance.push(value);
    }
  }
  return {
    sourceKey,
    section,
    sourcePages: pages,
    rawName: name,
    rawAddress,
    rawPhone,
    rawEmail,
    rawWebsite,
    rawOpeningHours,
    rawAdmissionHours,
    rawAssistanceDescription: assistance.length ? assistance.join("; ") : null,
    rawText: block,
    categoryHints: categoriesFromText(`${name} ${assistance.join(" ")}`, "pomoc-socjalna"),
    targetGroupHints: [],
  };
}

function parseOtherSupport(pages: string[]) {
  const { text, spans } = collapsedPageRange(pages, [64, 65, 66, 67, 68, 69, 70, 71, 72]);
  const markers = supportTitleProbes.map((probe, index) => ({ index: text.indexOf(probe), title: supportTitles[index], sourceIndex: index + 1 }));
  if (markers.some((marker) => marker.index < 0)) {
    const missing = markers.filter((marker) => marker.index < 0).map((marker) => marker.title);
    throw new Error(`Nie odnaleziono pozycji sekcji Inne formy wsparcia: ${missing.join(", ")}`);
  }
  return markers
    .sort((left, right) => left.index - right.index)
    .map((marker, index, sorted) => {
      const end = sorted[index + 1]?.index ?? text.length;
      const sourcePages = spans.filter((span) => span.end >= marker.index && span.start <= end).map((span) => span.page);
      return parseFlatSourceEntry(`other-support-${marker.sourceIndex}`, "Inne formy wsparcia", marker.title, text.slice(marker.index, end), [...new Set(sourcePages)]);
    });
}

function parseAppendix(pages: string[]) {
  const entries: SourceEntry[] = [];
  let index = 0;
  for (const page of [73, 74, 75, 76]) {
    const text = pageLines(pages, [page]).map((line) => line.text).join("\n");
    const blocks = text.split(/(?:^|\n)\s*•\s*/).slice(1);
    for (const rawBlock of blocks) {
      const block = clean(rawBlock);
      if (!block) continue;
      index += 1;
      const postalIndex = block.search(/\b\d{2}-\d{3}\s+Łódź/i);
      const phoneIndex = block.search(/\btel\.?\s*[:.]?/i);
      const name = clean(postalIndex >= 0 ? block.slice(0, postalIndex) : block);
      const address = postalIndex >= 0 ? clean(block.slice(postalIndex, phoneIndex >= 0 ? phoneIndex : undefined)) : null;
      const phone = phoneIndex >= 0 ? clean(block.slice(phoneIndex).replace(/^tel\.?\s*[:.]?\s*/i, "")) : null;
      entries.push({
        sourceKey: `appendix-${index}`,
        section: "Inne placówki pomocowe w Łodzi",
        sourcePages: [page],
        rawName: name,
        rawAddress: address,
        rawPhone: phone,
        rawEmail: null,
        rawWebsite: null,
        rawOpeningHours: null,
        rawAdmissionHours: null,
        rawAssistanceDescription: null,
        rawText: block,
        categoryHints: categoriesFromText(name, "inne"),
        targetGroupHints: [],
      });
    }
  }
  return entries;
}

export function parseCaritasSourceEntries(extractedText: string) {
  const pages = extractedText.split("\f");
  if (pages.length < 80) throw new Error(`PDF powinien mieć co najmniej 80 stron, odczytano ${pages.length}.`);
  const entries = [
    ...parseNumberedSection(pages, sectionConfig[0]),
    ...parseFridges(pages),
    ...parseFoodShares(pages),
    ...sectionConfig.slice(1).flatMap((config) => parseNumberedSection(pages, config)),
    ...parseOtherSupport(pages),
    ...parseAppendix(pages),
  ];
  const keys = new Set(entries.map((entry) => entry.sourceKey));
  if (keys.size !== entries.length) throw new Error("Parser wygenerował zduplikowane klucze pozycji źródłowych.");
  return entries;
}

function categoriesFromText(value: string, fallback: string) {
  const text = normalizeComparable(value);
  const categories = new Set<string>();
  if (/posilek|zywnosc|wyzywien|jadlod|kuchni|lodowk/.test(text)) categories.add("jedzenie");
  if (/nocleg|schronisko|hostel|dom samotnej matki|zakwater/.test(text)) categories.add("nocleg");
  if (/prysznic|kapiel|lazni/.test(text)) categories.add("prysznic");
  if (/higien|pralni|toalet/.test(text)) categories.add("higiena");
  if (/\bodziez|\bubran|\bbutik/.test(text)) categories.add("odziez");
  if (/medycz|zdrow|lekar|pielegni|hospic|leczen|rehabilit/.test(text)) categories.add("pomoc-medyczna");
  if (/psycholog|psychoterap|psychiatr|terapi/.test(text)) categories.add("pomoc-psychologiczna");
  if (/\bprawn|mediac/.test(text)) categories.add("pomoc-prawna");
  if (/socjal|obywatelsk|rodzin|bezdom|aktywiz|pracy|asystent|adopcyj|swietlic/.test(text)) categories.add("pomoc-socjalna");
  if (!categories.size) categories.add(fallback);
  return [...categories];
}

function inferOrganization(name: string) {
  const value = normalizeComparable(name);
  const mappings: Array<[RegExp, string]> = [
    [/caritas archidiecezji lodzkiej/, "Caritas Archidiecezji Łódzkiej"],
    [/bonifratrow|konwent bonifratrow/, "Konwent Bonifratrów w Łodzi"],
    [/siostr.*misjonark.*milosci/, "Siostry Misjonarki Miłości"],
    [/towarzystwo pomocy im sw.*alberta/, "Towarzystwo Pomocy im. św. Brata Alberta - Koło Łódzkie"],
    [/polski komitet pomocy spolecznej/, "Polski Komitet Pomocy Społecznej - Zarząd Okręgowy w Łodzi"],
    [/polskiego czerwonego krzyza|polski czerwony krzyz/, "Polski Czerwony Krzyż - Łódzki Oddział Okręgowy"],
    [/miejskie centrum terapii i profilaktyki zdrowotnej/, "Miejskie Centrum Terapii i Profilaktyki Zdrowotnej w Łodzi"],
    [/teczowi spolecznicy/, "Stowarzyszenie Tęczowi Społecznicy"],
    [/fundacj.*razem dla potrzebujacych/, "Fundacja Razem dla Potrzebujących"],
    [/mops|miejski osrodek pomocy spolecznej/, "Miejski Ośrodek Pomocy Społecznej w Łodzi"],
    [/centrum sluzby rodzinie/, "Centrum Służby Rodzinie"],
    [/fundacja wsparcia psychospołecznego/, "Fundacja Wsparcia Psychospołecznego"],
    [/abakus/, "Stowarzyszenie Samopomocowe ABAKUS"],
    [/fundacja sarepta/, "Fundacja Sarepta"],
    [/fundacja aktywizacja/, "Fundacja Aktywizacja"],
    [/fundacja mocni w duchu/, "Fundacja Mocni w Duchu"],
    [/stowarzyszenie monar/, "Stowarzyszenie MONAR"],
    [/stowarzyszenie promocji zdrowia i psychoterapii/, "Stowarzyszenie Promocji Zdrowia i Psychoterapii"],
  ];
  return mappings.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

function canonicalName(name: string, address: string | null) {
  const value = normalizeComparable(name);
  const normalizedAddress = normalizeAddress(address);
  if (value.includes("punkt pomocy charytatywnej") && value.includes("caritas")) return "punkt-pomocy-charytatywnej-caritas";
  if (value.startsWith("jadlodzielnia") && normalizedAddress.includes("wolczanska 108")) return "punkt-pomocy-charytatywnej-caritas";
  if (value.includes("dom najswietszego serca jezusowego") || value.includes("dom nsj siostry misjonarki")) return "dom-nsj-siostry-misjonarki-milosci";
  if (value.includes("hostel oslonowy") && value.includes("nowy poczatek")) return "hostel-oslonowy-nowy-poczatek";
  if (value.includes("teczowi spolecznicy") && normalizedAddress.includes("kutnowska 11")) return "teczowi-spolecznicy-kutnowska-11";
  if (value === "hostel readaptacyjny") return "hostel-readaptacyjny";
  if (normalizedAddress.includes("przybyszewskiego 253") && (value.includes("noclegownia") || value.includes("miejskie centrum terapii"))) return "noclegownia-przybyszewskiego-253";
  if (value.includes("punkty nieodplat") && normalizedAddress) return "nieodplatne-poradnictwo";
  if (value.includes("wydzial wspierania osob w kryzysie bezdomnosci")) return "mops-wydzial-bezdomnosci";
  if (value.includes("stowarzyszenie samopomocowe") && value.includes("abakus")) return "stowarzyszenie-abakus";
  return slugifyImportValue(name);
}

export function normalizeAddress(address: string | null) {
  if (!address) return "";
  return normalizeComparable(address)
    .replace(/\b(?:ul|aleja|al|plac|pl)\b/g, "")
    .replace(/\blodz\b/g, "")
    .replace(/\bnr\b/g, "")
    .replace(/\bk i galczynskiego\b/g, "galczynskiego")
    .replace(/\bstanislawa przybyszewskiego\b/g, "przybyszewskiego")
    .replace(/\ba prochnika\b/g, "prochnika")
    .replace(/\bw broniewskiego\b/g, "broniewskiego")
    .replace(/\bs zeromskiego\b/g, "zeromskiego")
    .replace(/\s+/g, " ")
    .trim();
}

function expandedEntries(entries: SourceEntry[]) {
  const legalAddresses: Record<string, string[]> = {
    "specialist-9": ["al. Piłsudskiego 100, Łódź", "ul. Krzemieniecka 2b, Łódź", "al. Politechniki 32, Łódź", "ul. Zachodnia 47, Łódź", "ul. Sienkiewicza 5, Łódź", "ul. Grota-Roweckiego 30, Łódź", "ul. Piotrkowska 153, Łódź", "ul. Piotrkowska 104, Łódź", "ul. Będzińska 5, Łódź", "ul. Objazdowa 17, Łódź"],
    "specialist-10": ["ul. Piotrkowska 153, Łódź", "ul. Zachodnia 47, Łódź", "al. Piłsudskiego 100, Łódź", "al. Politechniki 32, Łódź", "ul. Będzińska 5, Łódź", "ul. Objazdowa 17, Łódź", "ul. Sienkiewicza 5, Łódź"],
  };
  return entries.flatMap((entry) => {
    const addresses = legalAddresses[entry.sourceKey];
    if (!addresses) return [{ ...entry, instanceKey: entry.sourceKey }];
    return addresses.map((address, index) => ({
      ...entry,
      instanceKey: `${entry.sourceKey}-location-${index + 1}`,
      rawName: `${entry.rawName} - ${address.replace(/,\s*Łódź$/i, "")}`,
      rawAddress: address,
    }));
  });
}

function chooseName(entries: Array<SourceEntry & { instanceKey: string }>) {
  return [...entries].sort((left, right) => {
    const leftGeneric = /^(jadłodzielnia|lodówka społeczna)/i.test(left.rawName) ? 1 : 0;
    const rightGeneric = /^(jadłodzielnia|lodówka społeczna)/i.test(right.rawName) ? 1 : 0;
    return leftGeneric - rightGeneric || left.rawName.length - right.rawName.length;
  })[0].rawName;
}

function choosePrimaryCategory(entries: Array<SourceEntry & { instanceKey: string }>, categories: string[], text: string) {
  const sections = new Set(entries.map((entry) => entry.section));
  const normalized = normalizeComparable(text);
  if (sections.has("Gdzie spać - kobiety") || sections.has("Gdzie spać - mężczyźni")) return "nocleg";
  if (sections.has("Gdzie zjeść") || sections.has("Lodówki społeczne") || sections.has("Jadłodzielnie")) return "jedzenie";
  if (sections.has("Gdzie się ubrać")) return "odziez";
  if (sections.has("Gdzie się umyć")) return "prysznic";
  if (sections.has("Pomoc medyczna")) return "pomoc-medyczna";
  if (sections.has("Gdzie szukać pracy")) return "pomoc-socjalna";
  if (sections.has("Porada specjalisty")) {
    if (/\bprawn|mediac/.test(normalized)) return "pomoc-prawna";
    if (/psycholog|psychoterap|psychiatr/.test(normalized)) return "pomoc-psychologiczna";
    return categories.includes("pomoc-socjalna") ? "pomoc-socjalna" : categories[0] ?? null;
  }
  if (sections.has("Pomoc duchowa")) return /psycholog|psychoterap/.test(normalized) ? "pomoc-psychologiczna" : "inne";
  if (sections.has("Inne formy wsparcia")) {
    if (/dom samotnej matki/.test(normalized)) return "nocleg";
    if (/hospicjum|zaklad opieki zdrowotnej|osrodek leczen i rehabilitacji/.test(normalized)) return "pomoc-medyczna";
    if (/psychoterapi|ofiar przemocy|monar|poradnia.*terapi/.test(normalized)) return "pomoc-psychologiczna";
    return "pomoc-socjalna";
  }
  return entries[0].categoryHints[0] ?? categories[0] ?? null;
}

function firstPhone(value: string | null) {
  if (!value) return null;
  return value.match(/(?:\+48\s*)?(?:\d[\s-]*){9}/)?.[0]?.trim() ?? value.slice(0, 50);
}

function parseAddress(value: string | null) {
  if (!value) return { addressLine: null, street: null, buildingNumber: null, postalCode: null, city: "Łódź" };
  const postalCode = value.match(/\b\d{2}-\d{3}\b/)?.[0] ?? null;
  let line = clean(value.replace(/^\d{2}-\d{3}\s+Łódź,?\s*/i, "").replace(/,?\s*Łódź\s*$/i, "")).replace(/[,:;\s]+$/, "");
  if (!line) line = clean(value);
  const number = line.match(/\b(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?(?:\s*(?:lok\.?|lokal)\s*[\w/-]+)?)\s*$/i)?.[1] ?? null;
  const street = number ? clean(line.slice(0, line.length - number.length)) : line;
  return {
    addressLine: `${line}, Łódź`,
    street: street || null,
    buildingNumber: number,
    postalCode,
    city: "Łódź",
  };
}

function irregularHours(value: string | null) {
  if (!value) return false;
  return /2x|2 x|wg |według|indywidual|doraźnie|zależności|od 1 grudnia|w okresie|wakacje|wrzesień|zapisy|rezerwacji|świątecz/i.test(value);
}

function hoursNeedReview(value: string | null) {
  if (!value) return false;
  if (irregularHours(value)) return true;
  const parsed = structuredHours(value);
  const openCount = parsed.filter((row) => row.status === "OPEN").length;
  const dayMentions = new Set(
    [...clean(value).toLocaleLowerCase("pl-PL").matchAll(/poniedział\w*|wtork\w*|środ\w*|czwart\w*|piątk\w*|sobot\w*|niedziel\w*/g)]
      .map((match) => match[0].slice(0, 4)),
  ).size;
  const timeRanges = [...value.matchAll(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/g)].length;
  return openCount === 0 || (dayMentions > 1 && openCount < dayMentions) || timeRanges > Math.max(openCount, 1);
}

function defaultUnknownHours(note: string | null) {
  const weekdays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return weekdays.map((weekday) => ({
    weekday,
    status: "UNKNOWN" as "OPEN" | "CLOSED" | "UNKNOWN",
    opensAt: null as string | null,
    closesAt: null as string | null,
    note: (note || "Brak danych w źródle") as string | null,
    sortOrder: 0,
  }));
}

function structuredHours(value: string | null) {
  if (!value) return defaultUnknownHours(null);
  const text = clean(value).toLocaleLowerCase("pl-PL");
  if (/całodobowo|całą dobę/.test(text)) {
    return defaultUnknownHours(value).map((row) => ({ ...row, status: "OPEN", opensAt: "00:00", closesAt: "23:59", note: "Całodobowo - zapis źródłowy" }));
  }
  const plainRange = text.match(/^(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})$/);
  if (plainRange) {
    const opensAt = plainRange[1].replace(".", ":").padStart(5, "0");
    const closesAt = plainRange[2].replace(".", ":").padStart(5, "0");
    if (opensAt < closesAt) {
      return defaultUnknownHours(value).map((row) => ({ ...row, status: "OPEN", opensAt, closesAt, note: null }));
    }
  }
  const rows = defaultUnknownHours(value);
  const dayMap: Record<string, string> = { poniedziałek: "MONDAY", poniedziałki: "MONDAY", wtorek: "TUESDAY", wtorki: "TUESDAY", środa: "WEDNESDAY", środy: "WEDNESDAY", czwartek: "THURSDAY", czwartki: "THURSDAY", piątek: "FRIDAY", piątki: "FRIDAY", sobota: "SATURDAY", soboty: "SATURDAY", niedziela: "SUNDAY", niedziele: "SUNDAY" };
  const weekdayOrder = Object.values(dayMap).filter((value, index, all) => all.indexOf(value) === index);
  const ranges = [...text.matchAll(/(poniedział\w*|wtork\w*|środ\w*|czwart\w*|piątk\w*|sobot\w*|niedziel\w*)\s*(?:-\s*(poniedział\w*|wtork\w*|środ\w*|czwart\w*|piątk\w*|sobot\w*|niedziel\w*))?[^\d]{0,18}(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/gi)];
  for (const match of ranges) {
    const startDay = dayMap[normalizeComparable(match[1]).replace(/s$/, "")] ?? dayMap[match[1].toLocaleLowerCase("pl-PL")];
    const endDay = match[2] ? (dayMap[match[2].toLocaleLowerCase("pl-PL")] ?? startDay) : startDay;
    if (!startDay || !endDay) continue;
    const from = weekdayOrder.indexOf(startDay);
    const to = weekdayOrder.indexOf(endDay);
    for (const weekday of weekdayOrder.slice(from, to + 1)) {
      const row = rows.find((item) => item.weekday === weekday)!;
      row.status = "OPEN";
      row.opensAt = match[3].replace(".", ":").padStart(5, "0");
      row.closesAt = match[4].replace(".", ":").padStart(5, "0");
      row.note = null;
    }
  }
  return rows;
}

function accommodationData(name: string, text: string, targetGroups: string[]) {
  const normalized = normalizeComparable(`${name} ${text}`);
  if (!/nocleg|schronisko|hostel|dom samotnej matki|zakwater/.test(normalized)) return null;
  const type = normalized.includes("noclegownia")
    ? "NIGHT_SHELTER"
    : normalized.includes("interwencyj")
      ? "INTERVENTION_HOSTEL"
      : normalized.includes("hostel")
        ? "HOSTEL"
        : normalized.includes("dom samotnej matki")
          ? "WOMEN_WITH_CHILDREN_HOME"
          : "SHELTER";
  const totalBeds = text.match(/\b(\d{1,3})\s+miejsc\b/i)?.[1];
  const groups = new Set(targetGroups);
  if (/koedukacyj/.test(normalized)) groups.add("Koedukacyjne");
  if (/kobiet/.test(normalized)) groups.add("Kobiety");
  if (/mężczyzn|mezczyzn/.test(normalized)) groups.add("Mężczyźni");
  if (/matk|kobiet.*dzie/.test(normalized)) groups.add("Kobiety z dziećmi");
  return {
    type,
    targetGroups: [...groups],
    acceptsToday: "UNKNOWN",
    lodzRegistrationRequired: "UNKNOWN",
    referralRequired: "UNKNOWN",
    documentRequired: "UNKNOWN",
    sobrietyPolicy: "UNKNOWN",
    petPolicy: "UNKNOWN",
    wheelchairAccessibility: "UNKNOWN",
    careServices: "UNKNOWN",
    partialDependencySupport: "UNKNOWN",
    availabilityState: "UNKNOWN",
    capacityGroups: totalBeds ? [{ label: [...groups][0] ?? "Miejsca ogółem", totalBeds: Number(totalBeds), availableBeds: null }] : [],
  };
}

function dedupeKey(entry: SourceEntry & { instanceKey: string }) {
  const identity = `${canonicalName(entry.rawName, entry.rawAddress)}|${normalizeAddress(entry.rawAddress)}`;
  return createHash("sha256").update(identity).digest("hex").slice(0, 32);
}

export function buildCaritasCandidates(sourceEntries: SourceEntry[]) {
  const groups = new Map<string, Array<SourceEntry & { instanceKey: string }>>();
  for (const entry of expandedEntries(sourceEntries)) {
    const key = dedupeKey(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const candidates: CandidateDraft[] = [];
  for (const [candidateKey, entries] of groups) {
    const name = chooseName(entries);
    const address = entries.find((entry) => entry.rawAddress)?.rawAddress ?? null;
    const phone = entries.find((entry) => entry.rawPhone)?.rawPhone ?? null;
    const email = entries.find((entry) => entry.rawEmail)?.rawEmail ?? null;
    const website = entries.find((entry) => entry.rawWebsite)?.rawWebsite ?? null;
    const openingHours = entries.find((entry) => entry.rawOpeningHours)?.rawOpeningHours ?? null;
    const admissionHours = entries.find((entry) => entry.rawAdmissionHours)?.rawAdmissionHours ?? null;
    const assistance = entries.map((entry) => entry.rawAssistanceDescription).filter(Boolean).join("; ");
    const fullText = `${name} ${assistance}`;
    let categorySlugs = [...new Set(entries.flatMap((entry) => [...entry.categoryHints, ...categoriesFromText(`${entry.rawName} ${entry.rawAssistanceDescription ?? ""}`, entry.categoryHints[0] ?? "inne")]))];
    if (/wrzutka bez domni/.test(normalizeComparable(name))) categorySlugs = ["pomoc-socjalna"];
    const primaryCategorySlug = choosePrimaryCategory(entries, categorySlugs, `${name} ${assistance}`);
    const targetGroups = [...new Set(entries.flatMap((entry) => entry.targetGroupHints))];
    const reviewReasons: string[] = [];
    if (!address) reviewReasons.push("Brak jednoznacznego adresu stałej lokalizacji.");
    if (entries.some((entry) => entry.sourceKey === "food-12")) reviewReasons.push("Usługa mobilna z wieloma postojami - nie należy udawać jednego stałego punktu.");
    if (entries.some((entry) => entry.section === "Inne placówki pomocowe w Łodzi")) reviewReasons.push("Źródło nie opisuje zakresu pomocy wystarczająco do pewnej klasyfikacji.");
    if (entries.some((entry) => entry.sourceKey === "appendix-4")) reviewReasons.push("Wpis wskazuje siedzibę i kilka miejsc realizacji zadania.");
    if (hoursNeedReview(openingHours) || hoursNeedReview(admissionHours)) reviewReasons.push("Godziny są niejednoznaczne, sezonowe, nieregularne albo wymagają wcześniejszego umówienia.");
    if (!primaryCategorySlug) reviewReasons.push("Brak jednoznacznej kategorii głównej.");
    const addressParts = parseAddress(address);
    const accommodation = accommodationData(name, fullText, targetGroups);
    const requirements = [
      { kind: "REFERRAL", state: "UNKNOWN", label: "Wymagane skierowanie" },
      { kind: "DOCUMENT", state: "UNKNOWN", label: "Wymagany dokument" },
      { kind: "FEE", state: /bezpłat/i.test(fullText) ? "NO" : "UNKNOWN", label: "Odpłatność" },
      { kind: "LODZ_REGISTRATION", state: "UNKNOWN", label: "Wymagany ostatni meldunek w Łodzi" },
      { kind: "APPOINTMENT", state: /zapis|rezerwac|umów|umow/i.test(`${openingHours ?? ""} ${admissionHours ?? ""} ${assistance}`) ? "YES" : "UNKNOWN", label: "Wymagane wcześniejsze umówienie" },
    ];
    const accessibility = ["STEP_FREE_ENTRANCE", "RAMP", "ELEVATOR", "ACCESSIBLE_TOILET", "ACCESSIBLE_SHOWER", "WHEELCHAIR_PLACE", "ASSISTANCE_DOG", "CARE_SERVICES", "STAY_WITH_ASSISTANT"].map((feature) => ({ feature, state: "UNKNOWN" }));
    candidates.push({
      candidateKey,
      sourceKeys: [...new Set(entries.map((entry) => entry.sourceKey))],
      sourcePages: [...new Set(entries.flatMap((entry) => entry.sourcePages))].sort((a, b) => a - b),
      proposedName: name,
      proposedAddress: addressParts.addressLine,
      proposedPhone: firstPhone(phone),
      proposedEmail: email,
      proposedWebsite: website,
      proposedOrganizationName: entries.every((entry) => entry.section === "Lodówki społeczne" || entry.section === "Jadłodzielnie") ? null : inferOrganization(`${name} ${assistance}`),
      categorySlugs,
      primaryCategorySlug,
      reviewReasons: [...new Set(reviewReasons)],
      proposedData: {
        name,
        ...addressParts,
        phone: firstPhone(phone),
        email,
        website,
        description: assistance.slice(0, 4000) || null,
        categorySlugs,
        primaryCategorySlug,
        audience: targetGroups,
        services: [...new Set(entries.map((entry) => entry.rawAssistanceDescription).filter(Boolean))],
        operationHours: structuredHours(openingHours),
        admissionHours: structuredHours(admissionHours),
        rawOpeningHours: openingHours,
        rawAdmissionHours: admissionHours,
        requirements,
        accessibility,
        accommodation,
        sourcePages: [...new Set(entries.flatMap((entry) => entry.sourcePages))].sort((a, b) => a - b),
      },
    });
  }
  return candidates;
}

export function sourceDocumentHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

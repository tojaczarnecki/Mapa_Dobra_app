import { normalizeKrs, normalizeNip, normalizeRegon, normalizeWebUrl } from "../admin/directory-validation.ts";
import { normalizeTokenValues, splitTokenInput } from "../token-values.ts";

export const CANONICAL_IMPORT_FIELDS = [
  "name",
  "addressLine",
  "primaryCategory",
  "street",
  "buildingNumber",
  "postalCode",
  "city",
  "district",
  "phone",
  "email",
  "website",
  "description",
  "audience",
  "services",
  "organizationName",
  "organizationNip",
  "organizationRegon",
  "organizationKrs",
  "openingHours",
  "admissionHours",
] as const;

export type CanonicalImportField = (typeof CANONICAL_IMPORT_FIELDS)[number];
export type CanonicalImportValue = string | string[] | null;
export type CanonicalImportValues = Partial<Record<CanonicalImportField, CanonicalImportValue>>;

export type CanonicalFieldDefinition = {
  key: CanonicalImportField;
  label: string;
  required: boolean;
  aliases: string[];
};

const definitions: CanonicalFieldDefinition[] = [
  { key: "name", label: "Nazwa miejsca", required: true, aliases: ["nazwa", "nazwa miejsca", "nazwa placówki", "placówka", "punkt pomocy"] },
  { key: "addressLine", label: "Pełny adres", required: true, aliases: ["adres", "pełny adres", "adres placówki", "adres miejsca"] },
  { key: "primaryCategory", label: "Kategoria główna", required: true, aliases: ["kategoria", "kategoria główna", "kategoria podstawowa", "rodzaj pomocy"] },
  { key: "street", label: "Ulica", required: false, aliases: ["ulica", "street"] },
  { key: "buildingNumber", label: "Numer budynku", required: false, aliases: ["numer", "numer budynku", "nr budynku"] },
  { key: "postalCode", label: "Kod pocztowy", required: false, aliases: ["kod", "kod pocztowy", "kod pocztowy adresu"] },
  { key: "city", label: "Miasto", required: false, aliases: ["miasto", "miejscowość"] },
  { key: "district", label: "Dzielnica", required: false, aliases: ["dzielnica", "osiedle"] },
  { key: "phone", label: "Telefon", required: false, aliases: ["telefon", "tel", "nr telefonu", "numer telefonu"] },
  { key: "email", label: "E-mail", required: false, aliases: ["email", "e-mail", "e mail", "adres e-mail"] },
  { key: "website", label: "Strona WWW", required: false, aliases: ["www", "strona", "strona www", "strona internetowa", "website"] },
  { key: "description", label: "Opis", required: false, aliases: ["opis", "opis miejsca", "forma pomocy"] },
  { key: "audience", label: "Dla kogo", required: false, aliases: ["dla kogo", "odbiorcy", "grupa docelowa", "grupy docelowe"] },
  { key: "services", label: "Usługi na miejscu", required: false, aliases: ["usługi", "usługi na miejscu", "uslugi", "świadczenia"] },
  { key: "organizationName", label: "Organizacja", required: false, aliases: ["organizacja", "nazwa organizacji", "operator"] },
  { key: "organizationNip", label: "NIP organizacji", required: false, aliases: ["nip", "nip organizacji"] },
  { key: "organizationRegon", label: "REGON organizacji", required: false, aliases: ["regon", "regon organizacji"] },
  { key: "organizationKrs", label: "KRS organizacji", required: false, aliases: ["krs", "krs organizacji"] },
  { key: "openingHours", label: "Godziny działania", required: false, aliases: ["godziny", "godziny działania", "godziny otwarcia"] },
  { key: "admissionHours", label: "Godziny przyjęć", required: false, aliases: ["godziny przyjęć", "godziny przyjec", "przyjęcia", "przyjecia"] },
];

const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));

export function getCanonicalFieldDefinitions(): CanonicalFieldDefinition[] {
  return definitions.map((definition) => ({ ...definition, aliases: [...definition.aliases] }));
}

export function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .replace(/:+$/u, "")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/ł/gu, "l")
}

type MappingMatch = "exact" | "unresolved" | "conflict";
export type SuggestedColumn = {
  field: CanonicalImportField;
  columnIndex: number | null;
  header: string | null;
  match: MappingMatch;
};
export type MappingConflict = { columnIndex: number; header: string; fields: CanonicalImportField[] };
export type SuggestedColumnMapping = {
  fields: Record<CanonicalImportField, SuggestedColumn>;
  conflicts: MappingConflict[];
};

export function suggestColumnMapping(headers: string[]): SuggestedColumnMapping {
  const normalizedHeaders = headers.map(normalizeImportHeader);
  const candidates = new Map<CanonicalImportField, number[]>();
  const columnCandidates = new Map<number, CanonicalImportField[]>();

  for (const [columnIndex, header] of normalizedHeaders.entries()) {
    const fields = definitions.filter((definition) => definition.aliases.some((alias) => normalizeImportHeader(alias) === header)).map((definition) => definition.key);
    if (fields.length) columnCandidates.set(columnIndex, fields);
    for (const field of fields) candidates.set(field, [...(candidates.get(field) ?? []), columnIndex]);
  }

  const conflicts: MappingConflict[] = [];
  for (const [columnIndex, fields] of columnCandidates) {
    if (fields.length > 1) conflicts.push({ columnIndex, header: headers[columnIndex] ?? "", fields });
  }
  for (const [field, matches] of candidates) {
    if (matches.length > 1) {
      for (const columnIndex of matches) conflicts.push({ columnIndex, header: headers[columnIndex] ?? "", fields: [field] });
    }
  }
  const fields = Object.fromEntries(definitions.map((definition) => {
    const matches = candidates.get(definition.key) ?? [];
    const conflict = matches.some((columnIndex) => (columnCandidates.get(columnIndex)?.length ?? 0) > 1) || matches.length > 1;
    const columnIndex = conflict ? null : matches[0] ?? null;
    return [definition.key, {
      field: definition.key,
      columnIndex,
      header: columnIndex === null ? null : headers[columnIndex] ?? null,
      match: conflict ? "conflict" : columnIndex === null ? "unresolved" : "exact",
    } satisfies SuggestedColumn];
  })) as Record<CanonicalImportField, SuggestedColumn>;
  return { fields, conflicts };
}

export type ColumnMapping = Partial<Record<CanonicalImportField, number | null>>;
export type MappingIssueCode = "INVALID_MAPPING" | "DUPLICATE_COLUMN_MAPPING" | "MISSING_REQUIRED_MAPPING";
export type MappingIssue = { code: MappingIssueCode; field?: CanonicalImportField; columnIndex?: number | null };
export type ColumnMappingValidation = { ok: true; mapping: ColumnMapping } | { ok: false; errors: MappingIssue[] };

export function validateColumnMapping(headers: string[], mapping: ColumnMapping): ColumnMappingValidation {
  const errors: MappingIssue[] = [];
  const used = new Map<number, CanonicalImportField>();
  for (const [field, columnIndex] of Object.entries(mapping) as [CanonicalImportField, number | null][]) {
    if (!definitionByKey.has(field) || columnIndex === null || columnIndex === undefined) continue;
    if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= headers.length) {
      errors.push({ code: "INVALID_MAPPING", field, columnIndex });
      continue;
    }
    const previous = used.get(columnIndex);
    if (previous) errors.push({ code: "DUPLICATE_COLUMN_MAPPING", field, columnIndex });
    else used.set(columnIndex, field);
  }
  for (const definition of definitions.filter((item) => item.required)) {
    const columnIndex = mapping[definition.key];
    if (columnIndex === null || columnIndex === undefined || !Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= headers.length) {
      errors.push({ code: "MISSING_REQUIRED_MAPPING", field: definition.key });
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, mapping: { ...mapping } };
}

export type RowIssueCode = "MISSING_REQUIRED_FIELD" | "INVALID_EMAIL" | "INVALID_WEBSITE" | "INVALID_NIP" | "INVALID_REGON" | "INVALID_KRS";
export type RowIssue = { code: RowIssueCode; field: CanonicalImportField; message: string };
export type MappedImportRow = {
  rowNumber: number;
  rawValues: string[];
  values: CanonicalImportValues;
  errors: RowIssue[];
  warnings: RowIssue[];
  status: "READY" | "WARNING" | "ERROR";
};
export type MapRowsResult = { ok: true; rows: MappedImportRow[] } | { ok: false; errors: MappingIssue[] };

function scalar(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function list(value: string | undefined): string[] {
  return normalizeTokenValues(splitTokenInput((value ?? "").replace(/;/gu, ",")));
}

function issue(code: RowIssueCode, field: CanonicalImportField): RowIssue {
  const messages: Record<RowIssueCode, string> = {
    MISSING_REQUIRED_FIELD: "Brak wymaganej wartości.",
    INVALID_EMAIL: "Adres e-mail może wymagać poprawy.",
    INVALID_WEBSITE: "Adres WWW może wymagać poprawy.",
    INVALID_NIP: "NIP może wymagać poprawy.",
    INVALID_REGON: "REGON może wymagać poprawy.",
    INVALID_KRS: "KRS może wymagać poprawy.",
  };
  return { code, field, message: messages[code] };
}

function mappedValue(field: CanonicalImportField, raw: string | undefined): CanonicalImportValue {
  if (field === "audience" || field === "services") return list(raw);
  if (field === "organizationNip") return raw?.trim() ? normalizeNip(raw) : null;
  if (field === "organizationRegon") return raw?.trim() ? normalizeRegon(raw) : null;
  if (field === "organizationKrs") return raw?.trim() ? normalizeKrs(raw) : null;
  if (field === "website") return raw?.trim() ? normalizeWebUrl(raw) : null;
  return scalar(raw);
}

export function mapSpreadsheetRows(headers: string[], rows: string[][], mapping: ColumnMapping, rowNumbers?: number[]): MapRowsResult {
  const validation = validateColumnMapping(headers, mapping);
  if (!validation.ok) return validation;
  return {
    ok: true,
    rows: rows.map((rawValues, rowIndex) => {
      const values: CanonicalImportValues = {};
      const errors: RowIssue[] = [];
      const warnings: RowIssue[] = [];
      for (const definition of definitions) {
        const columnIndex = mapping[definition.key];
        if (columnIndex === null || columnIndex === undefined) continue;
        const raw = rawValues[columnIndex] ?? "";
        const value = mappedValue(definition.key, raw);
        values[definition.key] = value;
        if (definition.required && value === null || definition.required && Array.isArray(value) && value.length === 0) errors.push(issue("MISSING_REQUIRED_FIELD", definition.key));
        if (definition.key === "email" && scalar(raw) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(raw.trim())) warnings.push(issue("INVALID_EMAIL", definition.key));
        if (definition.key === "website" && scalar(raw) && value === null) warnings.push(issue("INVALID_WEBSITE", definition.key));
        if (definition.key === "organizationNip" && scalar(raw) && value === null) warnings.push(issue("INVALID_NIP", definition.key));
        if (definition.key === "organizationRegon" && scalar(raw) && value === null) warnings.push(issue("INVALID_REGON", definition.key));
        if (definition.key === "organizationKrs" && scalar(raw) && value === null) warnings.push(issue("INVALID_KRS", definition.key));
      }
      return {
        rowNumber: rowNumbers?.[rowIndex] ?? rowIndex + 2,
        rawValues: [...rawValues],
        values,
        errors,
        warnings,
        status: errors.length ? "ERROR" : warnings.length ? "WARNING" : "READY",
      };
    }),
  };
}

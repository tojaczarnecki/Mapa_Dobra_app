import { compareOrganizationNames, normalizeKrs, normalizeNip, normalizeOrganizationName, normalizeRegon, normalizeWebUrl } from "../admin/directory-validation.ts";
import type { CanonicalImportValues, MappedImportRow, RowIssueCode } from "./column-mapping.ts";

export type ImportOrganizationReference = {
  id: string;
  name: string;
  nip: string | null;
  regon: string | null;
  krs: string | null;
  active: boolean;
  slug?: string;
};

export type ImportCategoryReference = { id: string; slug: string; name: string; active: boolean };

export type ImportPlaceReference = {
  id: string;
  name: string;
  addressLine: string;
  street?: string | null;
  buildingNumber?: string | null;
  phone?: string | null;
  website?: string | null;
  organizationId?: string | null;
  primaryCategoryId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  publicationStatus?: string;
};

export type ImportMatchingReferences = {
  organizations: ImportOrganizationReference[];
  categories: ImportCategoryReference[];
  places: ImportPlaceReference[];
};

export type OrganizationMatch = {
  status: "MATCHED" | "POSSIBLE" | "CONFLICT" | "NONE" | "NEW_CANDIDATE";
  method: "NIP" | "REGON" | "KRS" | "NAME" | "SIMILAR_NAME" | null;
  organizationId: string | null;
  candidateIds: string[];
  reasons: string[];
  warnings: ("INACTIVE_ORGANIZATION" | "CONFLICTING_IDENTIFIERS")[];
};

export type CategoryMatch = {
  status: "MATCHED" | "UNRESOLVED";
  method: "SLUG" | "NAME" | "ALIAS" | null;
  categoryId: string | null;
  categorySlug: string | null;
  reasons: string[];
  warnings: ("INACTIVE_CATEGORY")[];
};

export type PlaceMatchCandidate = { placeId: string; reasons: string[] };
export type PlaceMatch = {
  classification: "EXACT_MATCH" | "POSSIBLE_MATCH" | "NEW";
  candidates: PlaceMatchCandidate[];
  reasons: string[];
  conflict: boolean;
};

export type InFileDuplicate = {
  rowNumber: number;
  reasons: ("SAME_NAME_AND_ADDRESS" | "SAME_ADDRESS_AND_PHONE")[];
};

export type MatchingAnalysisRow = {
  rowNumber: number;
  organizationMatch: OrganizationMatch;
  categoryMatch: CategoryMatch;
  placeMatch: PlaceMatch;
  inFileDuplicates: InFileDuplicate[];
  errors: ImportMatchingErrorCode[];
  warnings: ImportMatchingWarningCode[];
  status: "READY" | "REVIEW" | "ERROR";
};

export type ImportMatchingErrorCode = RowIssueCode | "UNRESOLVED_CATEGORY";
export type ImportMatchingWarningCode = RowIssueCode | "INACTIVE_CATEGORY" | "INACTIVE_ORGANIZATION" | "CONFLICTING_IDENTIFIERS" | "SOURCE_ROW_DUPLICATE";

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMatchingText(value: string): string {
  return normalizeOrganizationName(value);
}

export function normalizeMatchingPhone(value: string | null | undefined): string {
  const digits = textValue(value).replace(/\D/gu, "");
  return digits.startsWith("48") && digits.length === 11 ? digits.slice(2) : digits;
}

export function normalizeMatchingAddress(value: string | null | undefined): string {
  return normalizeMatchingText(textValue(value));
}

export function normalizeMatchingWebsite(value: string | null | undefined): string {
  const normalized = normalizeWebUrl(textValue(value));
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const host = url.hostname.toLocaleLowerCase("pl-PL").replace(/^www\./u, "");
    const path = url.pathname.replace(/\/+$/u, "") || "/";
    return `${host}${path}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}

function identifier(value: unknown, normalize: (input: string) => string | null): string {
  const input = textValue(value);
  return input ? normalize(input) ?? "" : "";
}

function organizationHasInput(values: CanonicalImportValues): boolean {
  return [values.organizationName, values.organizationNip, values.organizationRegon, values.organizationKrs].some((value) => textValue(value));
}

export function matchOrganization(values: CanonicalImportValues, references: ImportOrganizationReference[]): OrganizationMatch {
  const nip = identifier(values.organizationNip, normalizeNip);
  const regon = identifier(values.organizationRegon, normalizeRegon);
  const krs = identifier(values.organizationKrs, normalizeKrs);
  const byIdentifier = [
    ["NIP", nip, (organization: ImportOrganizationReference) => identifier(organization.nip, normalizeNip)],
    ["REGON", regon, (organization: ImportOrganizationReference) => identifier(organization.regon, normalizeRegon)],
    ["KRS", krs, (organization: ImportOrganizationReference) => identifier(organization.krs, normalizeKrs)],
  ] as const;
  const identifierMatches = byIdentifier.flatMap(([method, value, read]) => value ? references.filter((organization) => read(organization) === value).map((organization) => ({ method, organization })) : []);
  const matchedIds = [...new Set(identifierMatches.map(({ organization }) => organization.id))];
  if (matchedIds.length > 1) {
    return { status: "CONFLICT", method: null, organizationId: null, candidateIds: matchedIds, reasons: ["CONFLICTING_IDENTIFIERS"], warnings: ["CONFLICTING_IDENTIFIERS"] };
  }
  if (matchedIds.length === 1) {
    const match = identifierMatches.find(({ organization }) => organization.id === matchedIds[0]);
    const organization = references.find((item) => item.id === matchedIds[0]);
    return {
      status: "MATCHED",
      method: match?.method ?? null,
      organizationId: matchedIds[0],
      candidateIds: matchedIds,
      reasons: [`MATCHED_BY_${match?.method ?? "IDENTIFIER"}`],
      warnings: organization?.active === false ? ["INACTIVE_ORGANIZATION"] : [],
    };
  }

  const name = normalizeMatchingText(textValue(values.organizationName));
  if (!organizationHasInput(values)) return { status: "NONE", method: null, organizationId: null, candidateIds: [], reasons: [], warnings: [] };
  if (name) {
    const exact = references.filter((organization) => normalizeMatchingText(organization.name) === name);
    if (exact.length === 1) {
      return { status: "MATCHED", method: "NAME", organizationId: exact[0].id, candidateIds: [exact[0].id], reasons: ["MATCHED_BY_NAME"], warnings: exact[0].active ? [] : ["INACTIVE_ORGANIZATION"] };
    }
    if (exact.length > 1) return { status: "CONFLICT", method: "NAME", organizationId: null, candidateIds: exact.map((organization) => organization.id), reasons: ["MULTIPLE_NAME_MATCHES"], warnings: ["CONFLICTING_IDENTIFIERS"] };
    const similar = references.filter((organization) => compareOrganizationNames(textValue(values.organizationName), organization.name) === "similar");
    if (similar.length) return { status: "POSSIBLE", method: "SIMILAR_NAME", organizationId: null, candidateIds: similar.map((organization) => organization.id), reasons: ["SIMILAR_NAME"], warnings: [] };
  }
  return { status: "NEW_CANDIDATE", method: null, organizationId: null, candidateIds: [], reasons: ["NEW_ORGANIZATION_CANDIDATE"], warnings: [] };
}

const categoryAliases: Record<string, string> = {
  "odziez": "odziez",
  "prysznic": "higiena",
  "pomoc medyczna": "pomoc-medyczna",
  "pomoc psychologiczna": "pomoc-psychologiczna",
  "psycholog": "pomoc-psychologiczna",
  "wsparcie psychologiczne": "pomoc-psychologiczna",
  "pomoc prawna": "pomoc-prawna",
  "porady prawne": "pomoc-prawna",
  "pomoc socjalna": "pomoc-socjalna",
  "praca socjalna": "pomoc-socjalna",
  "wsparcie socjalne": "pomoc-socjalna",
};

function normalizeCategorySlug(value: string): string {
  return normalizeMatchingText(value).replace(/\s+/gu, "-");
}

export function matchCategory(value: unknown, references: ImportCategoryReference[]): CategoryMatch {
  const input = textValue(value);
  const normalizedName = normalizeMatchingText(input);
  if (!normalizedName) return { status: "UNRESOLVED", method: null, categoryId: null, categorySlug: null, reasons: ["UNRESOLVED_CATEGORY"], warnings: [] };
  if (normalizedName === "inne" || normalizedName === "inna pomoc") return { status: "UNRESOLVED", method: null, categoryId: null, categorySlug: null, reasons: ["UNRESOLVED_CATEGORY"], warnings: [] };
  const bySlug = references.filter((category) => normalizeCategorySlug(category.slug) === normalizeCategorySlug(input));
  const byName = references.filter((category) => normalizeMatchingText(category.name) === normalizedName);
  const aliasSlug = categoryAliases[normalizedName];
  const byAlias = aliasSlug ? references.filter((category) => normalizeCategorySlug(category.slug) === aliasSlug) : [];
  const match = bySlug[0] ? { category: bySlug[0], method: "SLUG" as const } : byName[0] ? { category: byName[0], method: "NAME" as const } : byAlias[0] ? { category: byAlias[0], method: "ALIAS" as const } : null;
  if (!match) return { status: "UNRESOLVED", method: null, categoryId: null, categorySlug: null, reasons: ["UNRESOLVED_CATEGORY"], warnings: [] };
  return {
    status: "MATCHED",
    method: match.method,
    categoryId: match.category.id,
    categorySlug: match.category.slug,
    reasons: [`MATCHED_BY_${match.method}`],
    warnings: match.category.active ? [] : ["INACTIVE_CATEGORY"],
  };
}

function placeSignals(values: CanonicalImportValues, place: ImportPlaceReference, organizationId: string | null): string[] {
  const reasons: string[] = [];
  const sameName = Boolean(textValue(values.name) && normalizeMatchingText(textValue(values.name)) === normalizeMatchingText(place.name));
  const sameAddress = Boolean(textValue(values.addressLine) && normalizeMatchingAddress(textValue(values.addressLine)) === normalizeMatchingAddress(place.addressLine));
  const sourcePhone = normalizeMatchingPhone(textValue(values.phone));
  const placePhone = normalizeMatchingPhone(place.phone);
  const samePhone = Boolean(sourcePhone && placePhone && sourcePhone === placePhone);
  const sourceWebsite = normalizeMatchingWebsite(textValue(values.website));
  const placeWebsite = normalizeMatchingWebsite(place.website);
  const sameWebsite = Boolean(sourceWebsite && placeWebsite && sourceWebsite === placeWebsite);
  const sameOrganization = Boolean(organizationId && place.organizationId && organizationId === place.organizationId);
  const similarName = Boolean(textValue(values.name) && compareOrganizationNames(textValue(values.name), place.name) === "similar");
  if (sameName && sameAddress) reasons.push("SAME_NAME_AND_ADDRESS");
  if (sameAddress && samePhone) reasons.push("SAME_ADDRESS_AND_PHONE");
  if (sameAddress && !sameName) reasons.push("SAME_NORMALIZED_ADDRESS");
  if (samePhone && !sameAddress) reasons.push("SAME_PHONE");
  if (sameWebsite) reasons.push("SAME_WEBSITE");
  if (sameOrganization && sameName) reasons.push("SAME_ORGANIZATION_AND_NAME");
  if (similarName) reasons.push("SIMILAR_NAME");
  return reasons;
}

export function matchPlace(values: CanonicalImportValues, references: ImportPlaceReference[], organizationId: string | null = null): PlaceMatch {
  const candidates = references.map((place) => ({ placeId: place.id, reasons: placeSignals(values, place, organizationId) })).filter((candidate) => candidate.reasons.length > 0);
  const exact = candidates.filter(({ reasons }) =>
    reasons.includes("SAME_NAME_AND_ADDRESS") ||
    reasons.includes("SAME_ADDRESS_AND_PHONE") ||
    (reasons.includes("SAME_ORGANIZATION_AND_NAME") && (reasons.includes("SAME_PHONE") || reasons.includes("SAME_WEBSITE") || reasons.includes("SAME_NORMALIZED_ADDRESS"))),
  );
  if (exact.length === 1) return { classification: "EXACT_MATCH", candidates: exact, reasons: exact[0].reasons, conflict: false };
  if (exact.length > 1) return { classification: "POSSIBLE_MATCH", candidates: exact, reasons: ["MULTIPLE_EXACT_CANDIDATES"], conflict: true };
  if (candidates.length) return { classification: "POSSIBLE_MATCH", candidates, reasons: [...new Set(candidates.flatMap(({ reasons }) => reasons))], conflict: false };
  return { classification: "NEW", candidates: [], reasons: [], conflict: false };
}

export function findInFileDuplicates(rows: Pick<MappedImportRow, "rowNumber" | "values">[]): Map<number, InFileDuplicate[]> {
  const result = new Map<number, InFileDuplicate[]>();
  for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
      const left = rows[leftIndex];
      const right = rows[rightIndex];
      const sameNameAndAddress = Boolean(textValue(left.values.name) && textValue(left.values.addressLine) && normalizeMatchingText(textValue(left.values.name)) === normalizeMatchingText(textValue(right.values.name)) && normalizeMatchingAddress(textValue(left.values.addressLine)) === normalizeMatchingAddress(textValue(right.values.addressLine)));
      const sameAddressAndPhone = Boolean(normalizeMatchingAddress(textValue(left.values.addressLine)) && normalizeMatchingPhone(textValue(left.values.phone)) && normalizeMatchingAddress(textValue(left.values.addressLine)) === normalizeMatchingAddress(textValue(right.values.addressLine)) && normalizeMatchingPhone(textValue(left.values.phone)) === normalizeMatchingPhone(textValue(right.values.phone)));
      const reasons: InFileDuplicate["reasons"] = [];
      if (sameNameAndAddress) reasons.push("SAME_NAME_AND_ADDRESS");
      if (sameAddressAndPhone) reasons.push("SAME_ADDRESS_AND_PHONE");
      if (reasons.length) {
        result.set(left.rowNumber, [...(result.get(left.rowNumber) ?? []), { rowNumber: right.rowNumber, reasons }]);
        result.set(right.rowNumber, [...(result.get(right.rowNumber) ?? []), { rowNumber: left.rowNumber, reasons }]);
      }
    }
  }
  return result;
}

export function analyzeImportRows(rows: MappedImportRow[], references: ImportMatchingReferences): MatchingAnalysisRow[] {
  const duplicates = findInFileDuplicates(rows);
  return rows.map((row) => {
    const organizationMatch = matchOrganization(row.values, references.organizations);
    const categoryMatch = matchCategory(row.values.primaryCategory, references.categories);
    const placeMatch = matchPlace(row.values, references.places, organizationMatch.organizationId);
    const errors: ImportMatchingErrorCode[] = row.errors.map((item) => item.code);
    const warnings: ImportMatchingWarningCode[] = row.warnings.map((item) => item.code);
    if (categoryMatch.status === "UNRESOLVED") errors.push("UNRESOLVED_CATEGORY");
    warnings.push(...organizationMatch.warnings, ...categoryMatch.warnings);
    const inFileDuplicates = duplicates.get(row.rowNumber) ?? [];
    if (inFileDuplicates.length) warnings.push("SOURCE_ROW_DUPLICATE");
    const review = organizationMatch.status === "CONFLICT" || organizationMatch.status === "POSSIBLE" || organizationMatch.status === "NEW_CANDIDATE" || categoryMatch.warnings.length > 0 || organizationMatch.warnings.length > 0 || placeMatch.classification !== "NEW" || inFileDuplicates.length > 0 || row.warnings.length > 0;
    return {
      rowNumber: row.rowNumber,
      organizationMatch,
      categoryMatch,
      placeMatch,
      inFileDuplicates,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      status: errors.length ? "ERROR" : review ? "REVIEW" : "READY",
    };
  });
}

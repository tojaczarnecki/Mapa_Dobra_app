"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { analyzeImportRows, type ImportMatchingReferences } from "@/lib/imports/matching";
import { mapSpreadsheetRows, mappingIssueMessage, suggestColumnMapping, validateColumnMapping, type CanonicalImportField, type ColumnMapping, type MappedImportRow, type SuggestedColumnMapping } from "@/lib/imports/column-mapping";
import { importIssueLabel } from "@/lib/imports/issue-labels";
import { parseImportFile, parseSelectedSheet, type ParsedSpreadsheet, type SpreadsheetErrorCode, type SpreadsheetSheet } from "@/lib/imports/spreadsheet";
import { persistImportAnalysis } from "@/lib/imports/persist-analysis";
import { materializeImportCandidate, type MaterializeCandidateDatabase, type MaterializeCandidateTransaction, type MaterializeImportCandidateResult } from "@/lib/imports/materialize-candidate";

const PREVIEW_LIMIT = 100;

export type ImportActionState =
  | { ok: false; message: string; code?: SpreadsheetErrorCode | "INVALID_MAPPING"; batchId?: string; fieldErrors?: Partial<Record<CanonicalImportField, string>> }
  | { ok: true; phase: "MAPPING"; fileName: string; fileHash: string; sheets: SpreadsheetSheet[]; sheetIndex: number; sheetName: string; headers: string[]; suggestedMapping: SuggestedColumnMapping; fieldErrors?: Partial<Record<CanonicalImportField, string>> }
  | { ok: true; phase: "PREVIEW"; fileName: string; fileHash: string; sheets: SpreadsheetSheet[]; sheetIndex: number; sheetName: string; headers: string[]; mapping: ColumnMapping; preview: PreviewRow[]; counts: PreviewCounts }
  | { ok: true; phase: "SAVED"; batchId: string };

export type PreviewRow = {
  rowNumber: number;
  name: string;
  address: string;
  category: string;
  organization: string;
  status: "READY" | "REVIEW" | "ERROR";
  problems: string[];
};

export type PreviewCounts = { total: number; ready: number; review: number; error: number };

export type MaterializeCandidateActionState =
  | { ok: false; message: string }
  | { ok: true; status: "CREATED"; message: string; placeId: string }
  | { ok: true; status: Exclude<MaterializeImportCandidateResult["status"], "CREATED" | "ALREADY_CREATED">; message: string; placeId?: string }
  | { ok: true; status: "ALREADY_CREATED"; message: string; placeId: string };

const errorMessages: Record<SpreadsheetErrorCode, string> = {
  UNSUPPORTED_FILE_TYPE: "Obsługiwane są pliki CSV i XLSX.",
  FILE_TOO_LARGE: "Plik jest za duży. Maksymalny rozmiar to 5 MB.",
  INVALID_CSV: "Nie udało się poprawnie odczytać pliku CSV.",
  INVALID_XLSX: "Nie udało się poprawnie odczytać pliku XLSX.",
  ZIP_LIMIT_EXCEEDED: "Plik XLSX przekracza bezpieczne limity.",
  TOO_MANY_ROWS: "Arkusz zawiera zbyt wiele wierszy. Maksymalnie 2000.",
  TOO_MANY_COLUMNS: "Arkusz zawiera zbyt wiele kolumn. Maksymalnie 80.",
  CELL_TOO_LONG: "Jedna z komórek zawiera zbyt dużo tekstu.",
  NO_SHEETS: "Plik nie zawiera arkusza.",
  EMPTY_SHEET: "Wybrany arkusz nie zawiera danych.",
  INVALID_HEADERS: "Nagłówki arkusza są niepoprawne lub niejednoznaczne.",
};

const canonicalFields = new Set<CanonicalImportField>([
  "name", "addressLine", "primaryCategory", "street", "buildingNumber", "postalCode", "city", "district", "phone", "email", "website", "description", "audience", "services", "organizationName", "organizationNip", "organizationRegon", "organizationKrs", "openingHours", "admissionHours",
]);

function errorState(error: unknown): ImportActionState {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code as SpreadsheetErrorCode : undefined;
  return { ok: false, code, message: code && code in errorMessages ? errorMessages[code] : "Nie udało się odczytać pliku." };
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function readMapping(value: FormDataEntryValue | null): ColumnMapping | null {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const mapping: ColumnMapping = {};
  for (const [field, index] of Object.entries(parsed)) {
    if (!canonicalFields.has(field as CanonicalImportField)) return null;
    if (index !== null && typeof index !== "number") return null;
    if (typeof index === "number" && (!Number.isInteger(index) || index < 0)) return null;
    mapping[field as CanonicalImportField] = index;
  }
  return mapping;
}

async function readFile(formData: FormData): Promise<{ file: File; buffer: Buffer; parsed: ParsedSpreadsheet; fileHash: string } | ImportActionState> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Wybierz plik CSV lub XLSX." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return { file, buffer, parsed: parseImportFile(file.name, file.type, buffer), fileHash: createHash("sha256").update(buffer).digest("hex") };
  } catch (error) {
    return errorState(error);
  }
}

async function references(): Promise<ImportMatchingReferences> {
  const [organizations, categories, places] = await Promise.all([
    prisma.organization.findMany({ select: { id: true, name: true, nip: true, regon: true, krs: true, active: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, name: true, active: true } }),
    prisma.place.findMany({ select: { id: true, name: true, addressLine: true, street: true, buildingNumber: true, phone: true, website: true, organizationId: true, primaryCategoryId: true, latitude: true, longitude: true, publicationStatus: true } }),
  ]);
  return { organizations, categories, places: places.map((place) => ({ ...place, latitude: place.latitude ? Number(place.latitude) : null, longitude: place.longitude ? Number(place.longitude) : null })) };
}

function previewRows(mapped: MappedImportRow[], analyzed: ReturnType<typeof analyzeImportRows>): { preview: PreviewRow[]; counts: PreviewCounts } {
  const counts = analyzed.reduce<PreviewCounts>((result, row) => {
    result.total += 1;
    result[row.status === "READY" ? "ready" : row.status === "REVIEW" ? "review" : "error"] += 1;
    return result;
  }, { total: 0, ready: 0, review: 0, error: 0 });
  const preview = analyzed.slice(0, PREVIEW_LIMIT).map((row, index) => {
    const mappedRow = mapped[index];
    const problems = [...row.errors, ...row.warnings, ...row.organizationMatch.reasons, ...row.organizationMatch.warnings, ...row.categoryMatch.reasons, ...row.categoryMatch.warnings, ...row.placeMatch.reasons, ...row.inFileDuplicates.flatMap((item) => item.reasons)].map(importIssueLabel).filter((value, item, values) => values.indexOf(value) === item);
    return { rowNumber: row.rowNumber, name: String(mappedRow?.values.name ?? ""), address: String(mappedRow?.values.addressLine ?? ""), category: String(mappedRow?.values.primaryCategory ?? ""), organization: String(mappedRow?.values.organizationName ?? ""), status: row.status, problems };
  });
  return { preview, counts };
}

async function analyzeForm(formData: FormData): Promise<ImportActionState> {
  const input = await readFile(formData);
  if (!("parsed" in input)) return input;
  const sheetIndex = Number(formData.get("sheetIndex") ?? 0);
  const sheet = parseSelectedSheet(input.parsed, Number.isInteger(sheetIndex) ? sheetIndex : 0);
  const mapping = readMapping(formData.get("mapping"));
  if (!mapping) return { ok: false, code: "INVALID_MAPPING", message: "Mapowanie kolumn jest niepoprawne." };
  const validation = validateColumnMapping(sheet.headers, mapping);
  if (!validation.ok) return { ok: false, code: "INVALID_MAPPING", message: "Uzupełnij wymagane mapowanie i usuń konflikty kolumn.", fieldErrors: Object.fromEntries(validation.errors.filter((issue) => issue.field).map((issue) => [issue.field, mappingIssueMessage(issue)])) };
  const mapped = mapSpreadsheetRows(sheet.headers, sheet.rows, validation.mapping, sheet.rowNumbers);
  if (!mapped.ok) return { ok: false, code: "INVALID_MAPPING", message: "Nie udało się zastosować mapowania kolumn." };
  const analyzed = analyzeImportRows(mapped.rows, await references());
  const summary = previewRows(mapped.rows, analyzed);
  return { ok: true, phase: "PREVIEW", fileName: input.file.name, fileHash: input.fileHash, sheets: input.parsed.sheets, sheetIndex, sheetName: sheet.sheetName, headers: sheet.headers, mapping: validation.mapping, ...summary };
}

async function inspectSpreadsheetInput(formData: FormData): Promise<ImportActionState> {
  const input = await readFile(formData);
  if (!("parsed" in input)) return input;
  try {
    const sheetIndex = Number(formData.get("sheetIndex") ?? 0);
    const sheet = parseSelectedSheet(input.parsed, Number.isInteger(sheetIndex) ? sheetIndex : 0);
    const suggestedMapping = suggestColumnMapping(sheet.headers);
    return { ok: true, phase: "MAPPING", fileName: input.file.name, fileHash: input.fileHash, sheets: input.parsed.sheets, sheetIndex, sheetName: sheet.sheetName, headers: sheet.headers, suggestedMapping };
  } catch (error) {
    return errorState(error);
  }
}

export async function inspectSpreadsheet(formData: FormData): Promise<ImportActionState> {
  await requirePermission("MANAGE_IMPORTS");
  return inspectSpreadsheetInput(formData);
}

export async function analyzeSpreadsheet(formData: FormData): Promise<ImportActionState> {
  await requirePermission("MANAGE_IMPORTS");
  try {
    return await analyzeForm(formData);
  } catch (error) {
    return errorState(error);
  }
}

export async function uploadSpreadsheet(formData: FormData): Promise<ImportActionState> {
  await requirePermission("MANAGE_IMPORTS");
  return inspectSpreadsheetInput(formData);
}

export async function saveSpreadsheetAnalysis(formData: FormData): Promise<ImportActionState> {
  const session = await requirePermission("MANAGE_IMPORTS");
  let result: Awaited<ReturnType<typeof persistImportAnalysis>>;
  try {
    const input = await readFile(formData);
    if (!("parsed" in input)) return input;
    const sheetIndex = Number(formData.get("sheetIndex") ?? 0);
    const sheet = parseSelectedSheet(input.parsed, Number.isInteger(sheetIndex) ? sheetIndex : 0);
    const mapping = readMapping(formData.get("mapping"));
    if (!mapping) return { ok: false, code: "INVALID_MAPPING", message: "Mapowanie kolumn jest niepoprawne." };
    const validation = validateColumnMapping(sheet.headers, mapping);
    if (!validation.ok) return { ok: false, code: "INVALID_MAPPING", message: "Uzupełnij wymagane mapowanie i usuń konflikty kolumn.", fieldErrors: Object.fromEntries(validation.errors.filter((issue) => issue.field).map((issue) => [issue.field, mappingIssueMessage(issue)])) };
    const mapped = mapSpreadsheetRows(sheet.headers, sheet.rows, validation.mapping, sheet.rowNumbers);
    if (!mapped.ok) return { ok: false, code: "INVALID_MAPPING", message: "Nie udało się zastosować mapowania kolumn." };
    const analyzed = analyzeImportRows(mapped.rows, await references());
    result = await persistImportAnalysis(prisma, {
      title: input.file.name,
      originalFileName: input.file.name,
      fileHash: input.fileHash,
      sourceUrl: "",
      publisher: session.user.displayName,
      edition: input.parsed.format,
      importDate: new Date(),
      sheetName: sheet.sheetName,
      headerRowNumber: sheet.headerRowNumber,
      mapping: validation.mapping,
      rows: analyzed.map((row, index) => ({ ...row, source: { rawValues: mapped.rows[index]?.rawValues ?? [], values: mapped.rows[index]?.values ?? {} } })),
    });
  } catch (error) {
    return errorState(error);
  }
  if (result.status === "CREATED") {
    revalidatePath("/admin/importy");
    redirect(`/admin/importy/${result.batchId}`);
  }
  return {
    ok: false,
    batchId: result.batchId,
    message: result.status === "DUPLICATE_IMPORT"
      ? "Ten plik został już wcześniej zapisany."
      : result.status === "EXISTING_INCOMPLETE_IMPORT"
        ? "Poprzedni import tego pliku nie został ukończony."
        : "Poprzednia próba importu zakończyła się błędem.",
  };
}

function materializeResultMessage(result: MaterializeImportCandidateResult): string {
  const messages: Record<MaterializeImportCandidateResult["status"], string> = {
    CREATED: "Utworzono szkic miejsca.",
    ALREADY_CREATED: "To miejsce zostało już utworzone.",
    CATEGORY_REVIEW_REQUIRED: "Kategoria wymaga ponownego sprawdzenia.",
    ORGANIZATION_REVIEW_REQUIRED: "Organizacja wymaga decyzji przed utworzeniem miejsca.",
    EXISTING_PLACE_REVIEW_REQUIRED: "Rekord prawdopodobnie odpowiada istniejącemu miejscu.",
    PLACE_MATCH_REVIEW_REQUIRED: "Możliwe dopasowanie do istniejącego miejsca wymaga decyzji.",
    SOURCE_DUPLICATE_REVIEW_REQUIRED: "Najpierw rozstrzygnij duplikat w pliku.",
    INVALID_CANDIDATE: "Nie można utworzyć miejsca z tego rekordu.",
    BATCH_NOT_READY: "Import nie jest gotowy do tworzenia miejsc.",
  };
  return messages[result.status];
}

export async function materializeCandidateAction(_state: MaterializeCandidateActionState, formData: FormData): Promise<MaterializeCandidateActionState> {
  const session = await requirePermission("MANAGE_IMPORTS");
  await requirePermission("CREATE_PLACES");
  const candidateId = formData.get("candidateId");
  if (typeof candidateId !== "string") return { ok: false, message: "Nie można utworzyć miejsca z tego rekordu." };
  const materializeDb: MaterializeCandidateDatabase = {
    $transaction: (callback) => prisma.$transaction((transaction) => callback(transaction as unknown as MaterializeCandidateTransaction)),
  };
  const result = await materializeImportCandidate(materializeDb, { candidateId, adminUserId: session.user.id, action: "CREATE_NEW_PLACE" });
  const batchId = formData.get("batchId");
  revalidatePath("/admin/importy");
  if (typeof batchId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(batchId)) revalidatePath(`/admin/importy/${batchId}`);
  return result.status === "CREATED" || result.status === "ALREADY_CREATED"
    ? { ok: true, status: result.status, message: materializeResultMessage(result), placeId: result.placeId }
    : { ok: true, status: result.status, message: materializeResultMessage(result) };
}

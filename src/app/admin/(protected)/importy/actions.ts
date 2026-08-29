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
import { canonicalizeDuplicatePair, duplicateRowNumbers, getDuplicateDecisionState, getDuplicateDisposition, isOriginalDuplicateEdge, mapDuplicateDecision, reconcileCandidateAfterDuplicateDecision, type DuplicateDecision, type DuplicateDecisionInput, type StoredDuplicateDecision } from "@/lib/imports/duplicate-decisions";
import { isSpreadsheetBatchMetadata } from "@/lib/imports/spreadsheet-place-review";
import { saveImportCandidateOrganizationDecision, type OrganizationDecisionPersistenceTransaction, type SaveOrganizationDecisionInput } from "@/lib/imports/organization-decision-persistence";
import { saveImportCandidateCategoryDecision, type SaveCategoryDecisionInput } from "@/lib/imports/category-decision-persistence";
import { resolveEffectiveCategory } from "@/lib/imports/category-decisions";
import type { OrganizationDecision } from "@/lib/imports/organization-decisions";

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

export type DuplicateDecisionActionState = { ok: boolean; message: string };

export type OrganizationDecisionActionState = { ok: boolean; message: string };

function duplicateDecisionInput(value: FormDataEntryValue | null): DuplicateDecisionInput | null {
  if (value === "KEEP_CURRENT" || value === "KEEP_OTHER" || value === "DIFFERENT_RECORDS") return value;
  return null;
}

function candidateRowNumber(candidateKey: string): number | null {
  const match = /^row-(\d+)$/.exec(candidateKey);
  if (!match) return null;
  const rowNumber = Number(match[1]);
  return Number.isSafeInteger(rowNumber) && rowNumber > 0 ? rowNumber : null;
}

function categoryStatus(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const analysis = (value as Record<string, unknown>).analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
  const category = (analysis as Record<string, unknown>).category;
  if (!category || typeof category !== "object" || Array.isArray(category)) return null;
  const status = (category as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

function categoryResolvedForDuplicateReconciliation(
  proposedData: unknown,
  decision: { primaryCategoryId: string; categories: Array<{ categoryId: string; sortOrder: number }> } | null,
  categorySnapshots: Array<{ id: string; active: boolean }>,
): boolean {
  if (!decision) return categoryStatus(proposedData) === "MATCHED";
  return resolveEffectiveCategory(
    { categoryIds: decision.categories.map((item) => item.categoryId), requiresReview: false, unresolvedTokens: [], warnings: [] },
    decision,
    categorySnapshots,
  ).status !== "REQUIRES_REVIEW";
}

export async function saveDuplicateDecision(formData: FormData): Promise<DuplicateDecisionActionState> {
  const session = await requirePermission("MANAGE_IMPORTS");
  const candidateId = formData.get("candidateId");
  const duplicateCandidateId = formData.get("duplicateCandidateId");
  const decision = duplicateDecisionInput(formData.get("decision"));
  if (typeof candidateId !== "string" || typeof duplicateCandidateId !== "string" || !decision || candidateId === duplicateCandidateId) {
    return { ok: false, message: "Nieprawidłowa decyzja duplikatu." };
  }
  try {
    await prisma.$transaction(async (transaction) => {
      const requestedPair = canonicalizeDuplicatePair(candidateId, duplicateCandidateId);
      await transaction.$queryRaw`SELECT "id" FROM "import_candidates" WHERE "id" IN (${requestedPair.candidateAId}::uuid, ${requestedPair.candidateBId}::uuid) ORDER BY "id" FOR UPDATE`;
      const candidates = await transaction.importCandidate.findMany({
        where: { id: { in: [candidateId, duplicateCandidateId] } },
        select: { id: true, candidateKey: true, importBatchId: true, proposedData: true, importBatch: { select: { metadata: true } }, categoryDecision: { select: { primaryCategoryId: true, categories: { select: { categoryId: true, sortOrder: true } } } } },
      });
      if (candidates.length !== 2 || candidates[0]?.importBatchId !== candidates[1]?.importBatchId || !isSpreadsheetBatchMetadata(candidates[0]?.importBatch.metadata)) throw new Error("INVALID_DUPLICATE_EDGE");
      const current = candidates.find((candidate) => candidate.id === candidateId);
      const other = candidates.find((candidate) => candidate.id === duplicateCandidateId);
      if (!current || !other) throw new Error("INVALID_DUPLICATE_EDGE");
      const currentRowNumber = current ? candidateRowNumber(current.candidateKey) : null;
      const otherRowNumber = other ? candidateRowNumber(other.candidateKey) : null;
      if (currentRowNumber === null || otherRowNumber === null || !isOriginalDuplicateEdge({ rowNumber: currentRowNumber, proposedData: current.proposedData }, { rowNumber: otherRowNumber, proposedData: other.proposedData })) throw new Error("INVALID_DUPLICATE_EDGE");

      const batchCandidates = await transaction.importCandidate.findMany({
        where: { importBatchId: current.importBatchId },
        select: { id: true, candidateKey: true, proposedData: true, status: true, resolution: true, createdPlaceId: true, queueStatus: true },
      });
      const categoryDecisionIds = candidates.flatMap((candidate) => candidate.categoryDecision?.categories.map((item) => item.categoryId) ?? []);
      const categorySnapshots = categoryDecisionIds.length > 0
        ? await transaction.category.findMany({ where: { id: { in: [...new Set(categoryDecisionIds)] } }, select: { id: true, active: true } })
        : [];
      const rowNumberToCandidateId = new Map<number, string>();
      for (const candidate of batchCandidates) {
        const rowNumber = candidateRowNumber(candidate.candidateKey);
        if (rowNumber !== null) rowNumberToCandidateId.set(rowNumber, candidate.id);
      }
      const storedDecisions = await transaction.importCandidateDuplicateDecision.findMany({ where: { candidateA: { importBatchId: current.importBatchId } }, select: { candidateAId: true, candidateBId: true, decision: true } });
      const nextDecision = { candidateAId: requestedPair.candidateAId, candidateBId: requestedPair.candidateBId, decision: mapDuplicateDecision(candidateId, duplicateCandidateId, decision) };
      const decisionsWithNext: StoredDuplicateDecision[] = [
        ...storedDecisions
          .filter((item) => item.candidateAId !== requestedPair.candidateAId || item.candidateBId !== requestedPair.candidateBId)
          .map((item) => ({ ...item, decision: item.decision as DuplicateDecision })),
        nextDecision,
      ];
      for (const candidate of [current, other]) {
        const state = getDuplicateDecisionState(candidate.id, duplicateRowNumbers(candidate.proposedData).map((rowNumber) => ({ rowNumber })), rowNumberToCandidateId, decisionsWithNext);
        if (state.hasConflictingKeepOutcome) throw new Error("CONFLICTING_DUPLICATE_DECISION");
      }
      await transaction.importCandidateDuplicateDecision.upsert({
        where: { candidateAId_candidateBId: requestedPair },
        create: { ...nextDecision, resolvedByAdminUserId: session.user.id },
        update: { decision: nextDecision.decision, resolvedByAdminUserId: session.user.id, resolvedAt: new Date(), note: null },
      });
      const currentById = new Map(batchCandidates.map((candidate) => [candidate.id, candidate]));
      for (const candidate of [current, other]) {
        const snapshot = currentById.get(candidate.id);
        if (!snapshot) continue;
        const state = getDuplicateDecisionState(candidate.id, duplicateRowNumbers(snapshot.proposedData).map((rowNumber) => ({ rowNumber })), rowNumberToCandidateId, decisionsWithNext);
        const categoryDecision = candidate.categoryDecision;
        const reconciliation = reconcileCandidateAfterDuplicateDecision(
          snapshot,
          getDuplicateDisposition(state),
          false,
          categoryResolvedForDuplicateReconciliation(snapshot.proposedData, categoryDecision, categorySnapshots),
        );
        if (reconciliation && (snapshot.status !== reconciliation.status || snapshot.queueStatus !== reconciliation.queueStatus)) {
          await transaction.importCandidate.update({ where: { id: snapshot.id }, data: reconciliation });
        }
      }
      const previous = storedDecisions.find((item) => item.candidateAId === requestedPair.candidateAId && item.candidateBId === requestedPair.candidateBId);
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: "IMPORT_CONFLICT_RESOLVED",
          entityType: "IMPORT_CANDIDATE",
          entityId: candidateId,
          changedFields: ["duplicateDecision"],
          previousValues: { candidateId, duplicateCandidateId, candidateAId: requestedPair.candidateAId, candidateBId: requestedPair.candidateBId, issue: "SOURCE_ROW_DUPLICATE", decision: previous?.decision ?? null },
          newValues: { candidateId, duplicateCandidateId, candidateAId: requestedPair.candidateAId, candidateBId: requestedPair.candidateBId, issue: "SOURCE_ROW_DUPLICATE", decision: nextDecision.decision },
          changeOrigin: "SOURCE_IMPORT",
          sourceReferenceId: candidateId,
          note: "Zapisano decyzję dotyczącą duplikatu wiersza źródłowego.",
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "CONFLICTING_DUPLICATE_DECISION"
      ? "Ta decyzja jest sprzeczna z wcześniejszym rozstrzygnięciem innego duplikatu. Najpierw zmień wcześniejszą decyzję."
      : error instanceof Error && error.message === "INVALID_DUPLICATE_EDGE"
        ? "Ta para nie jest potwierdzonym duplikatem z tego importu."
        : "Nie udało się zapisać decyzji duplikatu.";
    return { ok: false, message };
  }
  const batchId = formData.get("batchId");
  if (typeof batchId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(batchId)) revalidatePath(`/admin/importy/${batchId}`);
  revalidatePath("/admin/importy");
  return { ok: true, message: "Decyzja zapisana." };
}

function organizationDecisionInput(formData: FormData): OrganizationDecision | null {
  const decision = formData.get("decision");
  const organizationValue = formData.get("organizationId");
  const organizationId = typeof organizationValue === "string" && organizationValue.trim() ? organizationValue.trim() : null;
  if (decision === "NO_ORGANIZATION" && organizationId === null) return { decision, organizationId };
  if (decision === "SELECTED_ORGANIZATION" && organizationId) return { decision, organizationId };
  return null;
}

function organizationDecisionMessage(status: Exclude<Awaited<ReturnType<typeof saveImportCandidateOrganizationDecision>>["status"], "SAVED">): string {
  if (status === "INVALID_CANDIDATE") return "Ten kandydat nie może już otrzymać decyzji organizacyjnej.";
  if (status === "ORGANIZATION_NOT_FOUND") return "Wybrana organizacja nie istnieje.";
  if (status === "ORGANIZATION_INACTIVE") return "Wybrana organizacja jest nieaktywna.";
  return "Decyzja organizacyjna jest niepoprawna.";
}

export async function saveOrganizationDecision(formData: FormData): Promise<OrganizationDecisionActionState> {
  const session = await requirePermission("MANAGE_IMPORTS");
  const candidateId = formData.get("candidateId");
  const decision = organizationDecisionInput(formData);
  if (typeof candidateId !== "string" || !decision) return { ok: false, message: "Nieprawidłowa decyzja organizacyjna." };
  const input: SaveOrganizationDecisionInput = {
    candidateId,
    adminUserId: session.user.id,
    ...decision,
    note: typeof formData.get("note") === "string" ? formData.get("note") as string : null,
  };
  let result: Awaited<ReturnType<typeof saveImportCandidateOrganizationDecision>>;
  try {
    const decisionDb = {
      $transaction: <T>(callback: (transaction: OrganizationDecisionPersistenceTransaction) => Promise<T>) => prisma.$transaction((transaction) => callback(transaction as unknown as OrganizationDecisionPersistenceTransaction)),
    };
    result = await saveImportCandidateOrganizationDecision(decisionDb, input);
  } catch {
    return { ok: false, message: "Nie udało się zapisać decyzji organizacyjnej." };
  }
  const batchId = formData.get("batchId");
  if (result.status === "SAVED") {
    if (typeof batchId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(batchId)) revalidatePath(`/admin/importy/${batchId}`);
    revalidatePath("/admin/importy");
    return { ok: true, message: result.changed ? "Decyzja organizacyjna zapisana." : "Stan kandydata został ponownie przeliczony." };
  }
  return { ok: false, message: organizationDecisionMessage(result.status) };
}

export type CategoryDecisionActionState = { ok: true; message: string } | { ok: false; message: string };

function parseCategoryIds(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCategoryDecision(formData: FormData): Promise<CategoryDecisionActionState> {
  const session = await requirePermission("MANAGE_IMPORTS");
  const candidateId = formData.get("candidateId");
  const primaryCategoryId = formData.get("primaryCategoryId");
  const selectedCategoryIds = parseCategoryIds(formData.get("selectedCategoryIds"));
  if (typeof candidateId !== "string" || typeof primaryCategoryId !== "string" || !selectedCategoryIds) return { ok: false, message: "Nieprawidłowa decyzja kategorii." };
  const input: SaveCategoryDecisionInput = {
    candidateId,
    primaryCategoryId,
    selectedCategoryIds,
    resolvedByAdminUserId: session.user.id,
    note: typeof formData.get("note") === "string" ? formData.get("note") as string : null,
  };
  try {
    const result = await saveImportCandidateCategoryDecision({
      $transaction: (callback) => prisma.$transaction((transaction) => callback(transaction as never)),
    }, input);
    if (result.status !== "SAVED") {
      const messages: Record<Exclude<typeof result.status, "SAVED">, string> = {
        INVALID_CANDIDATE: "Ten kandydat nie może już otrzymać decyzji kategorii.",
        INVALID_DECISION: "Decyzja kategorii jest niepoprawna.",
        CATEGORY_NOT_FOUND: "Wybrana kategoria nie istnieje.",
        CATEGORY_INACTIVE: "Jedna z wybranych kategorii jest nieaktywna.",
        NOTE_TOO_LONG: "Notatka jest za długa.",
      };
      return { ok: false, message: messages[result.status] };
    }
    revalidatePath("/admin/importy");
    return { ok: true, message: result.changed ? "Decyzja kategorii zapisana." : "Decyzja kategorii została ponownie zapisana." };
  } catch {
    return { ok: false, message: "Nie udało się zapisać decyzji kategorii." };
  }
}

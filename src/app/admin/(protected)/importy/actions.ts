"use server";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin/session";
import { parseImportFile, suggestMapping, type ImportTable } from "@/lib/imports/spreadsheet";
import { prisma } from "@/lib/prisma";

type Field = "name" | "address" | "postalCode" | "city" | "phone" | "email" | "website" | "categories" | "organization" | "openingHours" | "requirements" | "description" | "accommodationType" | "capacity";
type StoredMetadata = { phase?: string; headers?: string[]; rows?: string[][]; sheets?: ImportTable[]; mapping?: Partial<Record<Field, string>>; categoryMapping?: Record<string, string>; organizationMapping?: Record<string, string>; errors?: string[] };

function metadata(value: Prisma.JsonValue | null): StoredMetadata { return value && typeof value === "object" && !Array.isArray(value) ? value as StoredMetadata : {}; }
function json(value: unknown) { return value as Prisma.InputJsonValue; }
function clean(value: unknown) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function normalize(value: string) { return clean(value).toLocaleLowerCase("pl-PL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim(); }
export async function uploadSpreadsheet(formData: FormData) {
  const session = await requirePermission("MANAGE_IMPORTS");
  const file = formData.get("file");
  if (!(file instanceof File)) redirect("/admin/importy/nowy?error=missing");
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseImportFile(file.name, file.type, buffer);
    const first = parsed.sheets[0];
    const hash = createHash("sha256").update(buffer).digest("hex");
    const key = `UPLOAD_${hash.slice(0, 20)}`;
    const existing = await prisma.importBatch.findUnique({ where: { key }, select: { id: true } });
    if (existing) redirect(`/admin/importy/${existing.id}?step=mapping`);
    const batch = await prisma.importBatch.create({ data: { key, title: file.name.slice(0, 500), sourceUrl: "", publisher: session.user.displayName.slice(0, 250), edition: parsed.format, sourceDocumentHash: hash, importDate: new Date(), fileName: file.name.slice(0, 255), fileFormat: parsed.format, sheetName: first.name.slice(0, 255), uploadedByAdminUserId: session.user.id, rawEntryCount: first.rows.length, candidateCount: first.rows.length, metadata: json({ phase: "MAPPING", sheets: parsed.sheets, headers: first.headers, rows: first.rows, mapping: suggestMapping(first.headers), errors: [] }) } });
    revalidatePath("/admin/importy");
    redirect(`/admin/importy/${batch.id}?step=mapping`);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_FILE";
    redirect(`/admin/importy/nowy?error=${encodeURIComponent(code)}`);
  }
}

export async function saveImportMapping(formData: FormData) {
  const session = await requirePermission("MANAGE_IMPORTS");
  const id = String(formData.get("id") ?? "");
  const mapping = JSON.parse(String(formData.get("mapping") ?? "{}")) as Partial<Record<Field, string>>;
  const categoryMapping = JSON.parse(String(formData.get("categoryMapping") ?? "{}")) as Record<string, string>;
  const organizationMapping = JSON.parse(String(formData.get("organizationMapping") ?? "{}")) as Record<string, string>;
  const batch = await prisma.importBatch.findUnique({ where: { id } });
  if (!batch) return;
  const stored = metadata(batch.metadata);
  const selectedSheet = stored.sheets?.find((sheet) => sheet.name === String(formData.get("sheetName") ?? ""));
  const headers = selectedSheet?.headers ?? stored.headers ?? [];
  const rows = selectedSheet?.rows ?? stored.rows ?? [];
  const normalizedMapping = { ...mapping, __headers: headers.join("\u0000") } as Partial<Record<Field, string>> & { __headers: string };
  if (!normalizedMapping.name || !normalizedMapping.address) return;
  await prisma.importBatch.update({ where: { id }, data: { sheetName: String(formData.get("sheetName") ?? batch.sheetName ?? "").slice(0, 255) || batch.sheetName, rawEntryCount: rows.length, candidateCount: rows.length, metadata: json({ ...stored, phase: "MAPPED", headers, rows, mapping: normalizedMapping, categoryMapping, organizationMapping, errors: [] }) } });
  await prisma.auditLog.create({ data: { adminUserId: session.user.id, action: "IMPORT_MAPPING_SAVED", entityType: "IMPORT_BATCH", entityId: id, changedFields: ["mapping", "categoryMapping", "organizationMapping"], newValues: { mapping: normalizedMapping, categoryMapping, organizationMapping }, changeOrigin: "SOURCE_IMPORT" } });
  revalidatePath(`/admin/importy/${id}`);
  redirect(`/admin/importy/${id}?step=validation`);
}

export async function stageImport(formData: FormData) {
  const session = await requirePermission("MANAGE_IMPORTS");
  const id = String(formData.get("id") ?? "");
  const batch = await prisma.importBatch.findUnique({ where: { id } });
  if (!batch) return;
  const stored = metadata(batch.metadata);
  const mapping = stored.mapping as (Partial<Record<Field, string>> & { __headers?: string }) | undefined;
  if (!mapping?.name || !mapping.address || !stored.rows?.length) return;
  const headers = mapping.__headers?.split("\u0000") ?? stored.headers ?? [];
  const index = (field: Field) => { const header = mapping[field]; return header ? headers.indexOf(header) : -1; };
  const rowValue = (row: string[], field: Field) => clean(index(field) >= 0 ? row[index(field)] : "");
  const [places, organizations] = await Promise.all([
    prisma.place.findMany({ select: { id: true, name: true, addressLine: true, phone: true, organizationId: true } }),
    prisma.organization.findMany({ where: { active: true }, select: { id: true, name: true } }),
    prisma.category.findMany({ where: { active: true }, select: { id: true, slug: true, name: true } }),
  ]);
  const categoryMap = stored.categoryMapping ?? {}, organizationMap = stored.organizationMapping ?? {};
  await prisma.$transaction(async (transaction) => {
    await transaction.importSourceEntry.deleteMany({ where: { importBatchId: id } });
    await transaction.importCandidate.deleteMany({ where: { importBatchId: id, resolution: null } });
    for (let rowIndex = 0; rowIndex < stored.rows!.length; rowIndex += 1) {
      const row = stored.rows![rowIndex], name = rowValue(row, "name"), address = rowValue(row, "address"), phone = rowValue(row, "phone"), email = rowValue(row, "email"), organizationValue = rowValue(row, "organization");
      const categoryValues = rowValue(row, "categories").split(/[;,|]/).map(clean).filter(Boolean);
      const categorySlugs = [...new Set(categoryValues.map((item) => categoryMap[item]).filter(Boolean))];
      const matchedOrganizationId = organizationValue ? organizationMap[organizationValue] || organizations.find((item) => normalize(item.name) === normalize(organizationValue))?.id : undefined;
      const same = places.find((place) => (phone && normalize(place.phone ?? "") === normalize(phone)) || (normalize(place.name) === normalize(name) && normalize(place.addressLine) === normalize(address)) || (address && normalize(place.addressLine) === normalize(address)));
      const reasons: string[] = [];
      if (!name) reasons.push("Brak nazwy placówki.");
      if (!address) reasons.push("Brak adresu.");
      if (categoryValues.some((item) => !categoryMap[item])) reasons.push("Nieznana lub nieprzypisana kategoria.");
      if (organizationValue && !matchedOrganizationId) reasons.push("Nieprzypisana organizacja.");
      if (same) reasons.push("Możliwe dopasowanie do istniejącego miejsca.");
      const candidateKey = `row-${rowIndex + 2}`;
      const source = await transaction.importSourceEntry.create({ data: { importBatchId: id, sourceKey: candidateKey, section: batch.sheetName ?? "Arkusz", sourcePages: [rowIndex + 2], rawName: name || "(brak nazwy)", rawAddress: address || null, rawPhone: phone || null, rawEmail: email || null, rawWebsite: rowValue(row, "website") || null, rawOpeningHours: rowValue(row, "openingHours") || null, rawAdmissionHours: null, rawAssistanceDescription: rowValue(row, "description") || null, rawText: row.join(" | "), parsedData: json({ rowNumber: rowIndex + 2, values: row }) } });
      await transaction.importCandidate.create({ data: { importBatchId: id, candidateKey, status: same ? "MATCH_EXISTING" : reasons.length ? "REQUIRES_REVIEW" : "IMPORT_READY", proposedName: name || "(brak nazwy)", proposedAddress: address || null, proposedPhone: phone || null, proposedEmail: email || null, proposedWebsite: rowValue(row, "website") || null, proposedOrganizationName: organizationValue || null, categorySlugs, primaryCategorySlug: categorySlugs[0] ?? null, reviewReasons: reasons, proposedData: json({ description: rowValue(row, "description"), city: rowValue(row, "city"), postalCode: rowValue(row, "postalCode"), organizationId: matchedOrganizationId ?? null, rawOpeningHours: rowValue(row, "openingHours"), rawRequirements: rowValue(row, "requirements"), sourceRow: row }), matchedPlaceId: same?.id ?? null, queueStatus: "PENDING", sources: { create: { sourceEntryId: source.id } } } });
    }
    const counts = await transaction.importCandidate.groupBy({ by: ["status"], where: { importBatchId: id }, _count: { _all: true } });
    const get = (status: string) => counts.find((item) => item.status === status)?._count._all ?? 0;
    await transaction.importBatch.update({ where: { id }, data: { status: get("REQUIRES_REVIEW") || get("MATCH_EXISTING") ? "COMPLETED_WITH_REVIEW" : "STAGED", candidateCount: stored.rows!.length, rawEntryCount: stored.rows!.length, matchedCount: get("MATCH_EXISTING"), reviewCount: get("REQUIRES_REVIEW"), skippedCount: 0, metadata: json({ ...stored, phase: "STAGED", stagedBy: session.user.id, stagedAt: new Date().toISOString() }) } });
    await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "IMPORT_STARTED", entityType: "IMPORT_BATCH", entityId: id, changedFields: ["status", "candidateCount"], newValues: { status: "STAGED", candidateCount: stored.rows!.length }, changeOrigin: "SOURCE_IMPORT" } });
  });
  revalidatePath("/admin/importy");
  revalidatePath(`/admin/importy/${id}`);
  redirect(`/admin/importy/${id}?status=REQUIRES_REVIEW`);
}

import { inflateRawSync } from "node:zlib";

export const IMPORT_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxUncompressedBytes: 20 * 1024 * 1024,
  maxRows: 2000,
  maxColumns: 80,
  maxZipEntries: 200,
  maxCellLength: 5000,
} as const;

export type SpreadsheetErrorCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_CSV"
  | "INVALID_XLSX"
  | "ZIP_LIMIT_EXCEEDED"
  | "TOO_MANY_ROWS"
  | "TOO_MANY_COLUMNS"
  | "CELL_TOO_LONG"
  | "NO_SHEETS"
  | "EMPTY_SHEET"
  | "INVALID_HEADERS";

export class SpreadsheetError extends Error {
  readonly code: SpreadsheetErrorCode;

  constructor(code: SpreadsheetErrorCode, message = code) {
    super(message);
    this.name = "SpreadsheetError";
    this.code = code;
  }
}

export type SpreadsheetSheet = { name: string; index: number };
export type SpreadsheetRow = string[];
export type ParsedSheet = {
  sheetName: string;
  headers: string[];
  rows: SpreadsheetRow[];
};
export type ParsedSpreadsheet = {
  format: "CSV" | "XLSX";
  sheets: SpreadsheetSheet[];
  parsedSheets: ParsedSheet[];
};

function fail(code: SpreadsheetErrorCode, message = code): never {
  throw new SpreadsheetError(code, message);
}

function cleanCell(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

function assertCellLength(value: string): string {
  if (value.length > IMPORT_LIMITS.maxCellLength) fail("CELL_TOO_LONG");
  return cleanCell(value);
}

function isEmptyRow(row: string[]): boolean {
  return row.every((cell) => cell === "");
}

function validateTable(sheetName: string, rawRows: string[][], presentRows?: Set<number>[]): ParsedSheet {
  const rows = rawRows.map((row) => Array.from({ length: row.length }, (_, index) => assertCellLength(row[index] ?? ""))).filter((row) => !isEmptyRow(row));
  if (!rows.length) fail("EMPTY_SHEET");

  const headers = rows[0];
  if (headers.length === 0) fail("INVALID_HEADERS");
  headers.forEach((header, index) => {
    if (!header && presentRows?.[0]?.has(index) !== false) fail("INVALID_HEADERS");
  });
  const seen = new Set<string>();
  for (const header of headers) {
    if (!header) continue;
    const key = header.toLocaleLowerCase("pl-PL");
    if (seen.has(key)) fail("INVALID_HEADERS");
    seen.add(key);
  }
  if (headers.length > IMPORT_LIMITS.maxColumns) fail("TOO_MANY_COLUMNS");

  const dataRows = rows.slice(1);
  if (dataRows.length > IMPORT_LIMITS.maxRows) fail("TOO_MANY_ROWS");
  const normalizedRows = dataRows.map((row) => {
    if (row.length > headers.length) fail("TOO_MANY_COLUMNS");
    return headers.map((_, index) => row[index] ?? "");
  });
  return { sheetName, headers, rows: normalizedRows };
}

function firstRecordDelimiter(input: string): string {
  let quoted = false;
  let record = "";
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === "\n" || char === "\r")) {
      break;
    } else {
      record += char;
    }
  }
  if (quoted) fail("INVALID_CSV");
  const counts = [",", ";", "\t"].map((delimiter) => ({
    delimiter,
    count: [...record].filter((char) => char === delimiter).length,
  }));
  return counts.sort((a, b) => b.count - a.count || [",", ";", "\t"].indexOf(a.delimiter) - [",", ";", "\t"].indexOf(b.delimiter))[0].delimiter;
}

function parseCsvRecords(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let afterQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        cell += char;
      }
    } else if (afterQuote) {
      if (char === delimiter) {
        row.push(cell);
        cell = "";
        afterQuote = false;
      } else if (char === "\r" || char === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
        afterQuote = false;
        if (char === "\r" && input[index + 1] === "\n") index += 1;
      } else if (char !== " " && char !== "\t") {
        fail("INVALID_CSV");
      }
    } else if (char === '"' && cell.trim() === "") {
      if (cell.trim()) fail("INVALID_CSV");
      cell = "";
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\r" || char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      cell += char;
    }
  }
  if (quoted) fail("INVALID_CSV");
  if (row.length || cell.length || afterQuote) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseCsv(input: string): ParsedSheet {
  const delimiter = firstRecordDelimiter(input);
  return validateTable("CSV", parseCsvRecords(input, delimiter));
}

function ensureRange(buffer: Buffer, offset: number, size: number): void {
  if (offset < 0 || size < 0 || offset + size > buffer.length) fail("INVALID_XLSX");
}

function readZip(buffer: Buffer): Map<string, Buffer> {
  if (buffer.length > IMPORT_LIMITS.maxBytes) fail("FILE_TOO_LARGE");
  if (buffer.length < 22 || buffer.readUInt32LE(buffer.length - 22) !== 0x06054b50) fail("INVALID_XLSX");
  const end = buffer.length - 22;
  const entries = buffer.readUInt16LE(end + 10);
  const centralSize = buffer.readUInt32LE(end + 12);
  const centralOffset = buffer.readUInt32LE(end + 16);
  if (entries > IMPORT_LIMITS.maxZipEntries) fail("ZIP_LIMIT_EXCEEDED");
  ensureRange(buffer, centralOffset, centralSize);

  const files = new Map<string, Buffer>();
  let cursor = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index += 1) {
    ensureRange(buffer, cursor, 46);
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) fail("INVALID_XLSX");
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    ensureRange(buffer, cursor + 46, nameLength + extraLength + commentLength);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (!name || name.startsWith("/") || name.split("/").includes("..")) fail("INVALID_XLSX");
    if ((flags & 0x1) !== 0 || method !== 0 && method !== 8) fail("INVALID_XLSX");
    if (compressedSize > IMPORT_LIMITS.maxBytes || uncompressedSize > IMPORT_LIMITS.maxUncompressedBytes) fail("ZIP_LIMIT_EXCEEDED");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > IMPORT_LIMITS.maxUncompressedBytes || compressedSize > 0 && uncompressedSize / compressedSize > 1000) fail("ZIP_LIMIT_EXCEEDED");
    if (name.toLowerCase().includes("vbaproject") || name.toLowerCase().startsWith("xl/embeddings/")) fail("INVALID_XLSX");

    ensureRange(buffer, localOffset, 30);
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) fail("INVALID_XLSX");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const payloadOffset = localOffset + 30 + localNameLength + localExtraLength;
    ensureRange(buffer, payloadOffset, compressedSize);
    const payload = buffer.subarray(payloadOffset, payloadOffset + compressedSize);
    let content: Buffer;
    try {
      const remainingUncompressed = IMPORT_LIMITS.maxUncompressedBytes - (totalUncompressed - uncompressedSize);
      content = method === 8 ? inflateRawSync(payload, { maxOutputLength: remainingUncompressed }) : payload;
    } catch (error) {
      if (error instanceof RangeError || (error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") fail("ZIP_LIMIT_EXCEEDED");
      fail("INVALID_XLSX");
    }
    if (content.length !== uncompressedSize) fail("INVALID_XLSX");
    files.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : null;
}

function columnIndex(reference: string): number {
  return [...reference].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function sharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((text) => decodeXml(text[1])).join(""),
  );
}

function parseXlsxRows(xml: string, shared: string[]): { rows: string[][]; presentRows: Set<number>[] } {
  const rows: string[][] = [];
  const presentRows: Set<number>[] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    const present = new Set<number>();
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = xmlAttribute(attributes, "r")?.match(/^([A-Z]+)\d+$/)?.[1];
      if (!reference) fail("INVALID_XLSX");
      const index = columnIndex(reference);
      if (index >= IMPORT_LIMITS.maxColumns) fail("TOO_MANY_COLUMNS");
      const type = xmlAttribute(attributes, "t");
      const formula = /<f\b[^>]*>/.test(body);
      const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
      const inlineMatch = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);
      let value = formula ? "" : decodeXml(valueMatch?.[1] ?? inlineMatch?.[1]?.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/g, "$1") ?? "");
      if (type === "s") value = shared[Number(value)] ?? "";
      if (type === "b") value = value === "1" ? "TRUE" : "FALSE";
      cells[index] = assertCellLength(value);
      present.add(index);
    }
    if (!isEmptyRow(cells)) {
      rows.push(cells);
      presentRows.push(present);
    }
  }
  return { rows, presentRows };
}

function resolveSheetPath(target: string): string {
  const normalized = target.replace(/^\/+/, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

export function parseXlsx(buffer: Buffer): ParsedSpreadsheet {
  const files = readZip(buffer);
  const workbook = files.get("xl/workbook.xml")?.toString("utf8");
  const relationships = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8");
  if (!workbook || !relationships || /<!DOCTYPE|<!ENTITY/i.test(workbook + relationships)) fail("INVALID_XLSX");
  const shared = sharedStrings(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  const rels = new Map<string, string>();
  for (const match of relationships.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)) {
    const id = xmlAttribute(match[1], "Id");
    const target = xmlAttribute(match[1], "Target");
    if (id && target) rels.set(id, resolveSheetPath(target));
  }
  const parsedSheets: ParsedSheet[] = [];
  for (const match of workbook.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)) {
    const attributes = match[1];
    const name = xmlAttribute(attributes, "name");
    const relationshipId = xmlAttribute(attributes, "id");
    const sheetPath = relationshipId ? rels.get(relationshipId) : undefined;
    const sheetXml = sheetPath ? files.get(sheetPath)?.toString("utf8") : undefined;
    if (!name || !sheetXml || /<!DOCTYPE|<!ENTITY/i.test(sheetXml)) fail("INVALID_XLSX");
    const sheetRows = parseXlsxRows(sheetXml, shared);
    parsedSheets.push(validateTable(name, sheetRows.rows, sheetRows.presentRows));
  }
  if (!parsedSheets.length) fail("NO_SHEETS");
  return {
    format: "XLSX",
    sheets: parsedSheets.map((sheet, index) => ({ name: sheet.sheetName, index })),
    parsedSheets,
  };
}

export function detectSpreadsheetFormat(fileName: string, mime: string, buffer: Buffer): "CSV" | "XLSX" {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "csv" && (!mime || mime.includes("csv") || mime === "text/plain" || mime === "application/octet-stream")) return "CSV";
  if (extension === "xlsx" && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && (!mime || mime.includes("spreadsheet") || mime === "application/octet-stream")) return "XLSX";
  fail("UNSUPPORTED_FILE_TYPE");
}

export function parseImportFile(fileName: string, mime: string, buffer: Buffer): ParsedSpreadsheet {
  if (buffer.length > IMPORT_LIMITS.maxBytes) fail("FILE_TOO_LARGE");
  const format = detectSpreadsheetFormat(fileName, mime, buffer);
  if (format === "CSV") {
    const sheet = parseCsv(buffer.toString("utf8"));
    return { format, sheets: [{ name: "CSV", index: 0 }], parsedSheets: [sheet] };
  }
  return parseXlsx(buffer);
}

export function parseSelectedSheet(parsed: ParsedSpreadsheet, sheetIndex: number): ParsedSheet {
  const sheet = parsed.parsedSheets[sheetIndex];
  if (!sheet) fail("NO_SHEETS");
  return sheet;
}

import { inflateRawSync } from "node:zlib";

export const IMPORT_LIMITS = { maxBytes: 5 * 1024 * 1024, maxUncompressedBytes: 20 * 1024 * 1024, maxRows: 2000, maxColumns: 80, maxZipEntries: 200 } as const;
export type ImportTable = { name: string; headers: string[]; rows: string[][] };
export type ParsedImport = { format: "CSV" | "XLSX"; sheets: ImportTable[] };

function clean(value: unknown) { return String(value ?? "").replace(/^\uFEFF/, "").replace(/\s+/g, " ").trim(); }

export function parseCsv(input: string): ImportTable {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, delimiter: string | null = null;
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((item) => ({ item, count: firstLine.split(item).length - 1 }));
  delimiter = counts.sort((a, b) => b.count - a.count)[0]?.item ?? ",";
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) { row.push(clean(cell)); cell = ""; }
    else if (char === "\r" || char === "\n") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(clean(cell)); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(clean(cell)); if (row.some(Boolean)) rows.push(row); }
  if (!rows.length) throw new Error("EMPTY_FILE");
  const width = Math.max(...rows.map((item) => item.length));
  if (width > IMPORT_LIMITS.maxColumns) throw new Error("TOO_MANY_COLUMNS");
  const headers = rows[0].map((value, index) => value || `Kolumna ${index + 1}`);
  if (rows.length - 1 > IMPORT_LIMITS.maxRows) throw new Error("TOO_MANY_ROWS");
  return { name: "CSV", headers, rows: rows.slice(1).map((item) => headers.map((_, index) => item[index] ?? "")) };
}

function readZip(buffer: Buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("MALFORMED_XLSX");
  const count = buffer.readUInt16LE(end + 10), offset = buffer.readUInt32LE(end + 16);
  if (count > IMPORT_LIMITS.maxZipEntries) throw new Error("MALFORMED_XLSX");
  const files = new Map<string, Buffer>();
  let totalUncompressed = 0;
  let cursor = offset;
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("MALFORMED_XLSX");
    const method = buffer.readUInt16LE(cursor + 10), compressed = buffer.readUInt32LE(cursor + 20), uncompressed = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32), localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (compressed > IMPORT_LIMITS.maxBytes || uncompressed > IMPORT_LIMITS.maxUncompressedBytes || totalUncompressed + uncompressed > IMPORT_LIMITS.maxUncompressedBytes || (compressed > 0 && uncompressed / compressed > 1000)) throw new Error("MALFORMED_XLSX");
    if (name.toLowerCase().includes("vbaproject") || name.toLowerCase().startsWith("xl/embeddings/")) throw new Error("MALFORMED_XLSX");
    if (method !== 0 && method !== 8) throw new Error("MALFORMED_XLSX");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("MALFORMED_XLSX");
    const localNameLength = buffer.readUInt16LE(localOffset + 26), localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const payload = buffer.subarray(localOffset + 30 + localNameLength + localExtraLength, localOffset + 30 + localNameLength + localExtraLength + compressed);
    files.set(name, method === 8 ? inflateRawSync(payload) : method === 0 ? payload : Buffer.alloc(0));
    totalUncompressed += uncompressed;
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function xmlText(value: string) { return value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'"); }
function columnIndex(reference: string) { return [...reference].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1; }

function sheetRows(xml: string, shared: string[]) {
  const output: string[][] = [];
  for (const match of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cell of match[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1], body = cell[2], ref = attrs.match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!ref) continue;
      const index = columnIndex(ref), hasFormula = /<f\b/.test(body), type = attrs.match(/\bt="([^"]+)"/)?.[1];
      let value = hasFormula ? "" : xmlText(body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<is>([\s\S]*?)<\/is>/)?.[1] ?? "");
      if (type === "s") value = shared[Number(value)] ?? "";
      if (type === "b") value = value === "1" ? "TRUE" : "FALSE";
      cells[index] = clean(value);
    }
    if (cells.some(Boolean)) output.push(cells);
  }
  if (!output.length) throw new Error("EMPTY_FILE");
  if (output.length - 1 > IMPORT_LIMITS.maxRows) throw new Error("TOO_MANY_ROWS");
  const headers = output[0].map((value, index) => value || `Kolumna ${index + 1}`);
  if (headers.length > IMPORT_LIMITS.maxColumns) throw new Error("TOO_MANY_COLUMNS");
  return { headers, rows: output.slice(1, IMPORT_LIMITS.maxRows + 1).map((row) => headers.map((_, index) => row[index] ?? "")) };
}

export function parseXlsx(buffer: Buffer): ParsedImport {
  const files = readZip(buffer);
  const shared = [...(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => xmlText(match[1]));
  const workbook = files.get("xl/workbook.xml")?.toString("utf8");
  if (!workbook) throw new Error("MALFORMED_XLSX");
  const relationships = files.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  const rels = new Map([...relationships.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [match[1], `xl/${match[2].replace(/^\//, "").replace(/^xl\//, "")}`]));
  const sheets = [...workbook.matchAll(/<sheet\b([^>]*)\/>/g)].map((match) => {
    const name = match[1].match(/\bname="([^"]+)"/)?.[1] ?? "Arkusz";
    const id = match[1].match(/r:id="([^"]+)"/)?.[1];
    const file = id ? files.get(rels.get(id) ?? "") : undefined;
    if (!file) throw new Error("MALFORMED_XLSX");
    return { name, ...sheetRows(file.toString("utf8"), shared) };
  });
  if (!sheets.length) throw new Error("EMPTY_FILE");
  return { format: "XLSX", sheets };
}

export function parseImportFile(fileName: string, mime: string, buffer: Buffer): ParsedImport {
  const extension = fileName.toLowerCase().split(".").pop();
  if (buffer.length > IMPORT_LIMITS.maxBytes) throw new Error("FILE_TOO_LARGE");
  if (extension === "csv" && (!mime || mime.includes("csv") || mime === "text/plain" || mime === "application/octet-stream")) return { format: "CSV", sheets: [parseCsv(buffer.toString("utf8"))] };
  if (extension === "xlsx" && (!mime || mime.includes("spreadsheet") || mime === "application/octet-stream")) return parseXlsx(buffer);
  throw new Error("UNSUPPORTED_FILE");
}

const aliases: Record<string, string[]> = { name: ["nazwa", "nazwa placowki", "placowka", "miejsce"], address: ["adres", "adres placowki", "ulica"], postalCode: ["kod pocztowy", "kod"], city: ["miasto", "miejscowosc"], phone: ["telefon", "tel", "nr telefonu"], email: ["email", "e mail", "e-mail"], website: ["www", "strona", "strona www"], categories: ["kategorie", "kategoria", "uslugi"], organization: ["organizacja", "operator", "fundacja"], openingHours: ["godziny", "godziny otwarcia"], requirements: ["warunki", "wymagania"], description: ["opis", "forma pomocy", "uslugi"], accommodationType: ["typ noclegu", "rodzaj noclegu"], capacity: ["liczba miejsc", "pojemnosc", "miejsca"] };
export const importFields = Object.keys(aliases);
export function suggestMapping(headers: string[]) {
  const normalize = (value: string) => clean(value).toLocaleLowerCase("pl-PL").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l");
  return Object.fromEntries(importFields.map((field) => [field, headers.find((header) => aliases[field].includes(normalize(header))) ?? ""]));
}

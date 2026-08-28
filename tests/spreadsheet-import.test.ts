import assert from "node:assert/strict";
import test from "node:test";
import {
  IMPORT_LIMITS,
  SpreadsheetError,
  parseCsv,
  parseImportFile,
  parseSelectedSheet,
  parseXlsx,
} from "../src/lib/imports/spreadsheet.ts";

function expectCode(action: () => unknown, code: SpreadsheetError["code"]): void {
  assert.throws(action, (error: unknown) => error instanceof SpreadsheetError && error.code === code);
}

function zip(files: Record<string, string>, options: { entryCount?: number } = {}): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const entries = options.entryCount ?? Object.keys(files).length;
  const items = Object.entries(files);
  for (let index = 0; index < entries; index += 1) {
    const [name, content] = items[index] ?? [`empty-${index}.bin`, ""];
    const nameBuffer = Buffer.from(name);
    const body = Buffer.from(content);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(body.length, 22);
    head.writeUInt16LE(nameBuffer.length, 26);
    local.push(head, nameBuffer, body);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(body.length, 20);
    directory.writeUInt32LE(body.length, 24);
    directory.writeUInt16LE(nameBuffer.length, 28);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, nameBuffer);
    offset += head.length + nameBuffer.length + body.length;
  }
  const localBuffer = Buffer.concat(local);
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries, 8);
  end.writeUInt16LE(entries, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(localBuffer.length, 16);
  return Buffer.concat([localBuffer, centralBuffer, end]);
}

function xlsxFiles(): Record<string, string> {
  return {
    "xl/workbook.xml": '<workbook><sheets><sheet name="Dane" sheetId="1" r:id="rId1"/><sheet name="Drugi" sheetId="2" r:id="rId2"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/sharedStrings.xml": "<sst><si><t>Nazwa</t></si><si><t>Łódź</t></si></sst>",
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Kod</t></is></c><c r="C1" t="inlineStr"><is><t>Opis</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><v>00123</v></c><c r="C2" t="inlineStr"><is><t>Tekst</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Formuła</t></is></c><c r="B3"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Inny</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Arkusz</t></is></c></row></sheetData></worksheet>',
  };
}

function excelColumn(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

test("CSV supports delimiters, BOM, quotes, multiline values and trailing cells", () => {
  assert.deepEqual(parseCsv("\uFEFFNazwa;Adres;Opis\r\nPunkt;\"ul. Dobra; Łódź\";\"Pierwsza\nDruga\"\r\n").headers, ["Nazwa", "Adres", "Opis"]);
  assert.deepEqual(parseCsv("Nazwa;Adres;Opis\nPunkt;\"ul. Dobra; Łódź\";\"Pierwsza\nDruga\"\n").rows, [["Punkt", "ul. Dobra; Łódź", "Pierwsza\nDruga"]]);
  assert.deepEqual(parseCsv("A,B,C\n1,\"z \"\"cudzysłowem\"\"\",\n\n").rows, [["1", 'z "cudzysłowem"', ""]]);
  assert.equal(parseCsv("A\tB\n1\t2").rows[0][1], "2");
});

test("CSV delimiter detection ignores delimiters inside quoted fields", () => {
  assert.deepEqual(parseCsv('Nazwa;Opis\nPlacówka;"Pomoc, jedzenie, nocleg"').rows[0], ["Placówka", "Pomoc, jedzenie, nocleg"]);
  assert.deepEqual(parseCsv('Name,Description\nPlace,"A; B; C"').rows[0], ["Place", "A; B; C"]);
});

test("CSV pads short rows and rejects malformed structure", () => {
  assert.deepEqual(parseCsv("A,B,C\n1,2").rows, [["1", "2", ""]]);
  expectCode(() => parseCsv("A,B\n1,2,3"), "TOO_MANY_COLUMNS");
  expectCode(() => parseCsv('A,B\n"unterminated,1'), "INVALID_CSV");
  expectCode(() => parseCsv("A,,C\n1,2,3"), "INVALID_HEADERS");
  expectCode(() => parseCsv("A,a\n1,2"), "INVALID_HEADERS");
  expectCode(() => parseCsv(""), "EMPTY_SHEET");
});

test("CSV limits are deterministic", () => {
  const tooManyRows = ["A", ...Array.from({ length: IMPORT_LIMITS.maxRows + 1 }, () => "x")].join("\n");
  expectCode(() => parseCsv(tooManyRows), "TOO_MANY_ROWS");
  const tooManyColumns = `${Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, (_, index) => `C${index}`).join(",")}\n${Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, () => "x").join(",")}`;
  expectCode(() => parseCsv(tooManyColumns), "TOO_MANY_COLUMNS");
  expectCode(() => parseCsv(`A\n${"x".repeat(IMPORT_LIMITS.maxCellLength + 1)}`), "CELL_TOO_LONG");
});

test("XLSX reads sheets, shared strings, inline strings, numbers and empty cells", () => {
  const parsed = parseXlsx(zip(xlsxFiles()));
  assert.deepEqual(parsed.sheets, [{ name: "Dane", index: 0 }, { name: "Drugi", index: 1 }]);
  assert.deepEqual(parseSelectedSheet(parsed, 0).headers, ["Nazwa", "Kod", "Opis"]);
  assert.deepEqual(parseSelectedSheet(parsed, 0).rows[0], ["Łódź", "00123", "Tekst"]);
  assert.equal(parseSelectedSheet(parsed, 0).rows[1][1], "");
  assert.equal(parseSelectedSheet(parsed, 1).rows[0][0], "Arkusz");
});

test("XLSX preserves sparse cell positions and columns after Z", () => {
  const files = xlsxFiles();
  files["xl/worksheets/sheet1.xml"] = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nazwa</t></is></c><c r="C1" t="inlineStr"><is><t>Telefon</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Punkt</t></is></c><c r="C2" t="inlineStr"><is><t>123</t></is></c></row></sheetData></worksheet>';
  const sparse = parseSelectedSheet(parseXlsx(zip(files)), 0);
  assert.deepEqual(sparse.headers, ["Nazwa", "", "Telefon"]);
  assert.deepEqual(sparse.rows[0], ["Punkt", "", "123"]);

  const wide = xlsxFiles();
  const headers = Array.from({ length: 28 }, (_, index) => `<c r="${excelColumn(index)}1" t="inlineStr"><is><t>${excelColumn(index)}</t></is></c>`).join("");
  wide["xl/worksheets/sheet1.xml"] = `<worksheet><sheetData><row r="1">${headers}</row></sheetData></worksheet>`;
  const wideSheet = parseSelectedSheet(parseXlsx(zip(wide)), 0);
  assert.equal(wideSheet.headers[0], "A");
  assert.equal(wideSheet.headers[25], "Z");
  assert.equal(wideSheet.headers[26], "AA");
  assert.equal(wideSheet.headers[27], "AB");
});

test("XLSX decodes XML entities in shared and inline strings", () => {
  const files = xlsxFiles();
  files["xl/sharedStrings.xml"] = "<sst><si><t>Pomoc &amp; Wsparcie</t></si></sst>";
  files["xl/worksheets/sheet1.xml"] = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>&lt;Łódź&gt;</t></is></c><c r="C1" t="inlineStr"><is><t>A &gt; B</t></is></c></row></sheetData></worksheet>';
  assert.deepEqual(parseSelectedSheet(parseXlsx(zip(files)), 0).headers, ["Pomoc & Wsparcie", "<Łódź>", "A > B"]);
});

test("XLSX never executes formulas and rejects malformed or unsafe files", () => {
  const parsed = parseXlsx(zip(xlsxFiles()));
  assert.equal(parseSelectedSheet(parsed, 0).rows[1][1], "");
  expectCode(() => parseXlsx(Buffer.from("not-a-zip")), "INVALID_XLSX");
  expectCode(() => parseXlsx(zip({ "xl/workbook.xml": "<workbook/>" })), "INVALID_XLSX");
  expectCode(() => parseXlsx(zip({ "xl/vbaProject.bin": "x" }, { entryCount: 1 })), "INVALID_XLSX");
  expectCode(() => parseXlsx(zip({ "xl/embeddings/oleObject1.bin": "x" }, { entryCount: 1 })), "INVALID_XLSX");
  expectCode(() => parseXlsx(zip({ "xl/workbook.xml": "<!DOCTYPE workbook><workbook/>" })), "INVALID_XLSX");
});

test("XLSX enforces entry, row, column and cell limits", () => {
  const manyEntries = Object.fromEntries(Array.from({ length: IMPORT_LIMITS.maxZipEntries + 1 }, (_, index) => [`file-${index}`, "x"]));
  expectCode(() => parseXlsx(zip(manyEntries)), "ZIP_LIMIT_EXCEEDED");
  const rowXml = Array.from({ length: IMPORT_LIMITS.maxRows + 2 }, (_, index) => `<row r="${index + 1}"><c r="A${index + 1}" t="inlineStr"><is><t>${index === 0 ? "A" : "x"}</t></is></c></row>`).join("");
  const rows = xlsxFiles();
  rows["xl/worksheets/sheet1.xml"] = `<worksheet><sheetData>${rowXml}</sheetData></worksheet>`;
  expectCode(() => parseXlsx(zip(rows)), "TOO_MANY_ROWS");
  const tooManyColumns = xlsxFiles();
  tooManyColumns["xl/worksheets/sheet1.xml"] = `<worksheet><sheetData><row r="1">${Array.from({ length: IMPORT_LIMITS.maxColumns + 1 }, (_, index) => `<c r="${excelColumn(index)}1" t="inlineStr"><is><t>${index === 0 ? "A" : "x"}</t></is></c>`).join("")}</row></sheetData></worksheet>`;
  expectCode(() => parseXlsx(zip(tooManyColumns)), "TOO_MANY_COLUMNS");
  const longCell = xlsxFiles();
  longCell["xl/worksheets/sheet1.xml"] = `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>${"x".repeat(IMPORT_LIMITS.maxCellLength + 1)}</t></is></c></row></sheetData></worksheet>`;
  expectCode(() => parseXlsx(zip(longCell)), "CELL_TOO_LONG");
  const noSheets = xlsxFiles();
  noSheets["xl/workbook.xml"] = "<workbook><sheets/></workbook>";
  expectCode(() => parseXlsx(zip(noSheets)), "NO_SHEETS");
});

test("file recognition requires the expected extension and XLSX ZIP signature", () => {
  assert.equal(parseImportFile("dane.csv", "text/csv", Buffer.from("A\n1")).format, "CSV");
  assert.equal(parseImportFile("dane.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", zip(xlsxFiles())).format, "XLSX");
  expectCode(() => parseImportFile("dane.xls", "application/octet-stream", Buffer.from("x")), "UNSUPPORTED_FILE_TYPE");
  expectCode(() => parseImportFile("dane.xlsx", "application/octet-stream", Buffer.from("PK\x03\x04fake")), "INVALID_XLSX");
  expectCode(() => parseImportFile("dane.xlsm", "application/octet-stream", zip(xlsxFiles())), "UNSUPPORTED_FILE_TYPE");
});

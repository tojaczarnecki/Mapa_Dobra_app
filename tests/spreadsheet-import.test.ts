import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, parseImportFile, parseXlsx, suggestMapping } from "../src/lib/imports/spreadsheet.ts";

function zip(files: Record<string, string>) {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name), body = Buffer.from(content);
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0, 6); head.writeUInt16LE(0, 8); head.writeUInt32LE(body.length, 18); head.writeUInt32LE(body.length, 22); head.writeUInt16LE(nameBuffer.length, 26);
    local.push(head, nameBuffer, body);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt32LE(body.length, 20); directory.writeUInt32LE(body.length, 24); directory.writeUInt16LE(nameBuffer.length, 28); directory.writeUInt32LE(offset, 42);
    central.push(directory, nameBuffer);
    offset += head.length + nameBuffer.length + body.length;
  }
  const centralBuffer = Buffer.concat(central), localBuffer = Buffer.concat(local), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(localBuffer.length, 16);
  return Buffer.concat([localBuffer, centralBuffer, end]);
}

test("CSV handles semicolon, BOM, quoted and multiline values", () => {
  const table = parseCsv("\uFEFFNazwa;Adres;Opis\nPunkt;\"ul. Dobra 1; Łódź\";\"Pierwsza\nDruga\"\n");
  assert.deepEqual(table.headers, ["Nazwa", "Adres", "Opis"]);
  assert.deepEqual(table.rows[0], ["Punkt", "ul. Dobra 1; Łódź", "Pierwsza Druga"]);
});

test("XLSX reads first and additional sheets without executing formulas", () => {
  const files = {
    "xl/workbook.xml": '<workbook><sheets><sheet name="Dane" sheetId="1" r:id="rId1"/><sheet name="Drugi" sheetId="2" r:id="rId2"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nazwa</t></is></c><c r="B1" t="inlineStr"><is><t>Adres</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Punkt</t></is></c><c r="B2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet2.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Inny</t></is></c></row></sheetData></worksheet>',
  };
  const parsed = parseXlsx(zip(files));
  assert.equal(parsed.sheets.length, 2);
  assert.equal(parsed.sheets[0].rows[0][0], "Punkt");
  assert.equal(parsed.sheets[0].rows[0][1], "");
});

test("unsupported and malformed files are rejected", () => {
  assert.throws(() => parseImportFile("data.pdf", "application/pdf", Buffer.from("x")), /UNSUPPORTED_FILE/);
  assert.throws(() => parseXlsx(Buffer.from("not-a-zip")), /MALFORMED_XLSX/);
});

test("mapping suggestions recognize Polish headers", () => {
  const mapping = suggestMapping(["Nazwa placówki", "Adres", "Telefon", "Kategorie"]);
  assert.equal(mapping.name, "Nazwa placówki");
  assert.equal(mapping.address, "Adres");
  assert.equal(mapping.phone, "Telefon");
  assert.equal(mapping.categories, "Kategorie");
});

test("realistic 1000-row CSV stays bounded and rejects rows above the limit", () => {
  const rows = ["Nazwa,Adres", ...Array.from({ length: 1000 }, (_, index) => `Miejsce ${index},ul. Testowa ${index}`)].join("\n");
  const started = performance.now();
  const parsed = parseCsv(rows);
  assert.equal(parsed.rows.length, 1000);
  assert.ok(performance.now() - started < 1000);
  const tooMany = ["Nazwa,Adres", ...Array.from({ length: 2001 }, (_, index) => `Miejsce ${index},ul. Testowa ${index}`)].join("\n");
  assert.throws(() => parseCsv(tooMany), /TOO_MANY_ROWS/);
});

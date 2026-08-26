import { XMLParser } from "fast-xml-parser";
import { normalizeKrs, normalizeNip, normalizeRegon } from "../structured-data.ts";

const GUS_BIR_URL = "https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnetrznej.svc";
const REQUEST_TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_LIMIT = 100;

export type GusRegistryData = {
  found: true;
  nip: string;
  name: string | null;
  regon: string | null;
  krs: string | null;
  legalForm: string | null;
  address: { street: string | null; buildingNumber: string | null; apartmentNumber: string | null; postalCode: string | null; city: string | null; voivodeship: string | null };
};

export type GusLookupErrorCode = "NOT_CONFIGURED" | "NOT_FOUND" | "TIMEOUT" | "PROVIDER" | "MALFORMED";

export class GusLookupError extends Error {
  readonly code: GusLookupErrorCode;
  constructor(code: GusLookupErrorCode) { super(code); this.code = code; this.name = "GusLookupError"; }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
const cache = new Map<string, { expiresAt: number; data: GusRegistryData }>();
const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, processEntities: false });

function text(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim();
  return result || null;
}

function valuesForKeys(value: unknown, keys: Set<string>, output: string[] = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (keys.has(key.toLocaleLowerCase("pl-PL"))) {
      if (Array.isArray(child)) child.forEach((item) => { const itemText = text(item); if (itemText) output.push(itemText); });
      else { const childText = text(child); if (childText) output.push(childText); }
    }
    valuesForKeys(child, keys, output);
  }
  return output;
}

function firstValue(value: unknown, ...keys: string[]) {
  return valuesForKeys(value, new Set(keys.map((key) => key.toLocaleLowerCase("pl-PL"))))[0] ?? null;
}

function parseNestedXml(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const decoded = value.replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, '"').replace(/&apos;/gu, "'").replace(/&amp;/gu, "&");
  if (!decoded.includes("<")) return value;
  try { return parseNestedXml(parser.parse(decoded)); } catch { return value; }
}

function parseNestedValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(parseNestedValues);
  if (typeof value === "string") {
    const parsed = parseNestedXml(value);
    return parsed === value ? value : parseNestedValues(parsed);
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, parseNestedValues(child)]));
}

export function parseGusRegistryResponse(xml: string, nipInput: string): GusRegistryData {
  const nip = normalizeNip(nipInput) ?? nipInput;
  let document: unknown;
  try { document = parseNestedValues(parseNestedXml(parser.parse(xml))); } catch { throw new GusLookupError("MALFORMED"); }
  const name = firstValue(document, "Nazwa", "NazwaPodmiotu", "NazwaSkrocona");
  const regon = normalizeRegon(firstValue(document, "Regon", "REGON") ?? "");
  const krs = normalizeKrs(firstValue(document, "Krs", "KRS") ?? "");
  const address = {
    street: firstValue(document, "Ulica", "NazwaUlicy"),
    buildingNumber: firstValue(document, "NumerNieruchomosci", "NrNieruchomosci", "NumerBudynku"),
    apartmentNumber: firstValue(document, "NumerLokalu", "NrLokalu"),
    postalCode: firstValue(document, "KodPocztowy"),
    city: firstValue(document, "Miejscowosc", "NazwaMiejscowosci"),
    voivodeship: firstValue(document, "Wojewodztwo", "NazwaWojewodztwa"),
  };
  const data = { found: true as const, nip, name, regon, krs, legalForm: firstValue(document, "FormaPrawna", "NazwaFormyPrawnej", "PodstawowaFormaPrawna"), address };
  if (!data.name && !data.regon && !data.krs && !data.address.city) throw new GusLookupError("NOT_FOUND");
  return data;
}

function loginEnvelope(key: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><Zaloguj xmlns="http://CIS.BIR.WS"><pKluczUzytkownika>${key}</pKluczUzytkownika></Zaloguj></soap:Body></soap:Envelope>`;
}

function searchEnvelope(nip: string) {
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><DaneSzukajPodmioty xmlns="http://CIS.BIR.WS"><pParametryWyszukiwania><NIP>${nip}</NIP></pParametryWyszukiwania></DaneSzukajPodmioty></soap:Body></soap:Envelope>`;
}

async function request(fetchImpl: FetchLike, body: string, action: string, headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(GUS_BIR_URL, { method: "POST", headers: { "content-type": "application/soap+xml; charset=utf-8", SOAPAction: action, ...headers }, body, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new GusLookupError("PROVIDER");
    return await response.text();
  } catch (error) {
    if (error instanceof GusLookupError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new GusLookupError("TIMEOUT");
    throw new GusLookupError("PROVIDER");
  } finally { clearTimeout(timeout); }
}

function sessionId(xml: string) {
  return firstValue(parseNestedXml(parser.parse(xml)), "ZalogujResult", "IdentyfikatorSesji");
}

export function isGusConfigured(environment: NodeJS.ProcessEnv = process.env) { return Boolean(environment.GUS_API_KEY?.trim()); }

export async function lookupGusByNip(nipInput: string, fetchImpl: FetchLike = fetch): Promise<GusRegistryData> {
  const nip = normalizeNip(nipInput);
  if (!nip) throw new GusLookupError("MALFORMED");
  const key = process.env.GUS_API_KEY?.trim();
  if (!key) throw new GusLookupError("NOT_CONFIGURED");
  const cached = cache.get(nip);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  try {
    const sid = sessionId(await request(fetchImpl, loginEnvelope(key), "http://CIS.BIR.WS/Zaloguj"));
    if (!sid) throw new GusLookupError("PROVIDER");
    const data = parseGusRegistryResponse(await request(fetchImpl, searchEnvelope(nip), "http://CIS.BIR.WS/DaneSzukajPodmioty", { sid }), nip);
    cache.set(nip, { expiresAt: Date.now() + CACHE_TTL_MS, data });
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return data;
  } catch (error) {
    if (error instanceof GusLookupError) throw error;
    throw new GusLookupError("PROVIDER");
  }
}

export const GUS_REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS;

import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { requireIsolatedTestDatabase } from "./test-env-guard.mjs";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const connectionString = requireIsolatedTestDatabase();
const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;
if (!connectionString || !email || !password) throw new Error("Missing local test environment variables.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const stamp = Date.now().toString();
const slug = `test-cms-etap-c-${stamp}`;

function decodeHtml(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function inputs(formHtml) {
  const result = new Map();
  for (const match of formHtml.matchAll(/<input\b([^>]*)>/gu)) {
    const attributes = match[1];
    const name = attributes.match(/\bname="([^"]+)"/u)?.[1];
    if (!name) continue;
    const value = attributes.match(/\bvalue="([^"]*)"/u)?.[1] ?? "";
    result.set(decodeHtml(name), decodeHtml(value));
  }
  return result;
}

function findForm(html, predicate) {
  for (const match of html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gu)) {
    const fields = inputs(match[1]);
    if (predicate(fields, match[1])) return fields;
  }
  throw new Error("Expected form not found.");
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...options });
}

async function getHtml(path, cookie = "") {
  const response = await request(path, { headers: cookie ? { Cookie: cookie } : undefined });
  assert.equal(response.status, 200, `GET ${path} returned ${response.status}`);
  return response.text();
}

async function submitAction(path, cookie, fields, overrides = {}) {
  const data = new FormData();
  for (const [name, value] of fields) data.set(name, value);
  for (const [name, value] of Object.entries(overrides)) data.set(name, String(value));
  const response = await request(path, { method: "POST", headers: { Cookie: cookie, Origin: baseUrl }, body: data });
  assert.ok([200, 303].includes(response.status), `POST ${path} returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
}

async function login() {
  const html = await getHtml("/admin/login");
  const form = findForm(html, (fields) => [...fields.keys()].some((key) => key.startsWith("$ACTION_")));
  const data = new FormData();
  for (const [name, value] of form) data.set(name, value);
  data.set("email", email);
  data.set("password", password);
  const response = await request("/admin/login", { method: "POST", headers: { Origin: baseUrl }, body: data });
  const sessionCookie = response.headers.getSetCookie().find((value) => value.startsWith("mapa_dobra_admin_session="));
  assert.ok(sessionCookie, "Admin login did not set a session cookie.");
  return sessionCookie.split(";", 1)[0];
}

function schedule(mondayPeriods = []) {
  return ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((weekday) => weekday === "MONDAY" && mondayPeriods.length
    ? { weekday, status: "OPEN", periods: mondayPeriods, note: "" }
    : { weekday, status: "UNKNOWN", periods: [], note: "Brak potwierdzonych godzin" });
}

function initialPayload(organizationId) {
  return {
    name: `TEST CMS Etap C ${stamp}`,
    slug,
    organizationId,
    primaryCategorySlug: "nocleg",
    categorySlugs: ["nocleg", "higiena"],
    typeLabel: "Schronisko testowe",
    description: "TEST kontrolny pełnego CMS Mapy Dobra.",
    street: "Testowaa",
    buildingNumber: "17",
    addressLine: "ul. Testowaa 17, Łódź",
    postalCode: "90-001",
    city: "Łódź",
    district: "Śródmieście",
    latitude: 51.7592,
    longitude: 19.456,
    phone: "+48 420 000 001",
    email: "cms-test@example.com",
    website: "https://example.com/cms-test",
    socialMedia: "",
    publicationStatus: "DRAFT",
    operationalStatus: "OPEN_TODAY",
    todayHoursLabel: "",
    audience: ["mężczyźni"],
    services: ["nocleg", "higiena"],
    openingHours: { operation: schedule([{ opensAt: "08:00", closesAt: "16:00" }]), admission: schedule([{ opensAt: "18:00", closesAt: "22:00" }]) },
    requirements: [
      { kind: "REFERRAL", state: "UNKNOWN", label: "Wymagane skierowanie", note: "" },
      { kind: "DOCUMENT", state: "UNKNOWN", label: "Wymagany dokument", note: "" },
      { kind: "FEE", state: "UNKNOWN", label: "Odpłatność", note: "" },
      { kind: "LODZ_REGISTRATION", state: "UNKNOWN", label: "Wymagany ostatni meldunek w Łodzi", note: "" },
      { kind: "APPOINTMENT", state: "UNKNOWN", label: "Wymagane wcześniejsze umówienie", note: "" },
    ],
    accessibility: [
      { feature: "STEP_FREE_ENTRANCE", state: "UNKNOWN", label: "Wejście bez stopni", note: "" },
      { feature: "WHEELCHAIR_PLACE", state: "UNKNOWN", label: "Miejsce dla osoby na wózku", note: "" },
    ],
    isAccommodation: true,
    accommodation: {
      type: "SHELTER",
      audienceLabel: "dla mężczyzn",
      targetGroups: ["mężczyźni"],
      acceptedProfiles: ["man"],
      admissionHoursDescription: "Przyjęcia do 22:00",
      acceptsToday: "YES",
      lodzRegistrationRequired: "UNKNOWN",
      referralRequired: "UNKNOWN",
      documentRequired: "UNKNOWN",
      sobrietyPolicy: "UNKNOWN",
      sobrietyNote: "",
      petPolicy: "UNKNOWN",
      petNote: "",
      wheelchairAccessibility: "UNKNOWN",
      careServices: "UNKNOWN",
      partialDependencySupport: "UNKNOWN",
      mealsInfo: "",
      hygieneInfo: "Prysznic w godzinach dyżuru",
      luggageInfo: "",
      returnTimeInfo: "Do 22:00",
      maxStayInfo: "",
      feeInfo: "",
      availabilityState: "AVAILABLE",
      availabilityLabel: "4 wolne miejsca",
      availabilityNote: "TEST",
      importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
      capacityGroups: [
        { label: "Mężczyźni", totalBeds: 40, availableBeds: 4, active: true },
        { label: "Pula pomocnicza", totalBeds: 5, availableBeds: 1, active: true },
      ],
    },
    markVerified: false,
    internalNote: "TEST CMS Etap C",
  };
}

async function main() {
  const before = await prisma.place.count({ where: { recordKind: "TEST" } });
  const cookie = await login();
  const organization = await prisma.organization.create({
    data: { slug: `test-organizacja-cms-${stamp}`, name: `TEST Organizacja CMS ${stamp}`, active: true },
  });

  const newHtml = await getHtml("/admin/miejsca/nowe", cookie);
  const newForm = findForm(newHtml, (fields) => fields.has("payload"));
  await submitAction("/admin/miejsca/nowe", cookie, newForm, { payload: JSON.stringify(initialPayload(organization.id)) });
  let place = await prisma.place.findUniqueOrThrow({ where: { slug }, include: { accommodation: { include: { capacityGroups: true } } } });
  assert.equal(place.publicationStatus, "DRAFT");
  assert.equal(place.recordKind, "PRODUCTION");
  await prisma.place.update({ where: { id: place.id }, data: { recordKind: "TEST" } });

  const editHtml = await getHtml(`/admin/miejsca/${place.id}/edytuj`, cookie);
  const editForm = findForm(editHtml, (fields) => fields.has("payload"));
  const edited = JSON.parse(editForm.get("payload"));
  edited.addressLine = "ul. Testowa 17, Łódź";
  edited.street = "Testowa";
  edited.phone = "+48 501 222 333";
  edited.categorySlugs = ["nocleg", "jedzenie"];
  edited.openingHours.operation = schedule([{ opensAt: "08:00", closesAt: "12:00" }, { opensAt: "14:00", closesAt: "18:00" }]);
  edited.requirements.find((item) => item.kind === "DOCUMENT").state = "YES";
  edited.markVerified = true;
  edited.verificationSource = "PHONE_CALL";
  edited.internalNote = "TEST: dane zweryfikowane telefonicznie.";
  edited.accommodation.capacityGroups.find((group) => group.label === "Pula pomocnicza").active = false;
  await submitAction(`/admin/miejsca/${place.id}/edytuj`, cookie, editForm, { payload: JSON.stringify(edited) });

  place = await prisma.place.findUniqueOrThrow({
    where: { id: place.id },
    include: { categories: { include: { category: true } }, openingHours: true, requirements: true, accommodation: { include: { capacityGroups: true, availabilityHistory: true } } },
  });
  assert.equal(place.recordKind, "TEST");
  assert.equal(place.addressLine, "ul. Testowa 17, Łódź");
  assert.equal(place.phone, "+48 501 222 333");
  assert.deepEqual(place.categories.map((item) => item.category.slug).sort(), ["jedzenie", "nocleg"]);
  assert.equal(place.openingHours.filter((row) => row.kind === "OPERATION" && row.weekday === "MONDAY").length, 2);
  assert.equal(place.requirements.find((item) => item.kind === "DOCUMENT").state, "YES");
  assert.equal(place.verificationStatus, "VERIFIED");
  assert.ok(place.verifiedAt);
  assert.ok(place.verifiedByAdminUserId);
  assert.equal(place.accommodation.capacityGroups.find((group) => group.label === "Pula pomocnicza").active, false);

  const detailHtml = await getHtml(`/admin/miejsca/${place.id}`, cookie);
  assert.match(detailHtml, /Historia zmian/u);
  assert.match(detailHtml, /Aktualizacja dostępności/u);
  const quickForm = findForm(detailHtml, (fields) => fields.has("updates") && fields.get("placeId") === place.id);
  const activeGroup = place.accommodation.capacityGroups.find((group) => group.active);
  await submitAction(`/admin/miejsca/${place.id}`, cookie, quickForm, { updates: JSON.stringify([{ id: activeGroup.id, availableBeds: 2 }]) });

  const afterQuick = await prisma.place.findUniqueOrThrow({ where: { id: place.id }, include: { accommodation: { include: { capacityGroups: true, availabilityHistory: true } } } });
  assert.equal(afterQuick.accommodation.capacityGroups.find((group) => group.id === activeGroup.id).availableBeds, 2);
  assert.ok(afterQuick.accommodation.availabilityHistory.some((entry) => entry.capacityGroupId === activeGroup.id && entry.availableBeds === 2 && entry.adminUserId));

  const refreshedDetail = await getHtml(`/admin/miejsca/${place.id}`, cookie);
  const publishForm = findForm(refreshedDetail, (fields) => fields.get("status") === "PUBLISHED");
  await submitAction(`/admin/miejsca/${place.id}`, cookie, publishForm);
  assert.equal((await prisma.place.findUniqueOrThrow({ where: { id: place.id } })).publicationStatus, "PUBLISHED");

  const publicResponse = await request(`/lodz/nocleg/${slug}`);
  assert.equal(publicResponse.status, 404, "Published TEST record must remain unavailable publicly.");
  const listHtml = await getHtml(`/admin/miejsca?q=${encodeURIComponent(`TEST CMS Etap C ${stamp}`)}&recordKind=TEST&sort=updated`, cookie);
  assert.match(listHtml, new RegExp(`TEST CMS Etap C ${stamp}`, "u"));
  assert.match(listHtml, />TEST</u);

  const auditLogs = await prisma.auditLog.findMany({ where: { entityId: place.id }, orderBy: { createdAt: "asc" } });
  assert.ok(auditLogs.some((entry) => entry.action === "PLACE_CREATED"));
  assert.ok(auditLogs.some((entry) => entry.action === "PLACE_UPDATED"));
  assert.ok(auditLogs.some((entry) => entry.action === "AVAILABILITY_UPDATED"));
  assert.ok(auditLogs.some((entry) => entry.action === "PLACE_PUBLISHED"));
  assert.equal(await prisma.place.count({ where: { recordKind: "TEST" } }), before + 1);

  console.log(JSON.stringify({
    placeId: place.id,
    slug,
    recordKind: "TEST",
    fullEdit: true,
    correctedAddress: true,
    changedPhone: true,
    twoOpeningIntervals: true,
    changedCategory: true,
    triStateChanged: "UNKNOWN -> YES",
    verifiedByAdmin: true,
    disabledCapacityGroupRetained: true,
    quickAvailability: "4 -> 2",
    auditLogs: auditLogs.length,
    publicStatus: 404,
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

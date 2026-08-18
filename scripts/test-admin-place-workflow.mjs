import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;
if (!connectionString || !email || !password) throw new Error("Missing local test environment variables.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const stamp = `${Date.now()}`;
const manualSlug = `test-admin-nocleg-${stamp}`;
const newPlaceName = `TEST Publikacja zgłoszenia ${stamp}`;

function decodeHtml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
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

async function getHtml(path, cookie = "") {
  const response = await fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : undefined, redirect: "manual" });
  assert.equal(response.status, 200, `GET ${path} returned ${response.status}`);
  return response.text();
}

async function submitAction(path, cookie, fields, overrides = {}) {
  const data = new FormData();
  for (const [name, value] of fields) data.set(name, value);
  for (const [name, value] of Object.entries(overrides)) data.set(name, String(value));
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { Cookie: cookie, Origin: baseUrl },
    body: data,
    redirect: "manual",
  });
  assert.ok([200, 303].includes(response.status), `POST ${path} returned ${response.status}: ${(await response.text()).slice(0, 400)}`);
  return response;
}

async function login() {
  const html = await getHtml("/admin/login");
  const form = findForm(html, (fields) => [...fields.keys()].some((key) => key.startsWith("$ACTION_")));
  const response = await submitAction("/admin/login", "", form, { email, password });
  const setCookies = response.headers.getSetCookie();
  const sessionCookie = setCookies.find((value) => value.startsWith("mapa_dobra_admin_session="));
  assert.ok(sessionCookie, "Admin login did not set a session cookie.");
  return sessionCookie.split(";", 1)[0];
}

function days(mondayPeriods = []) {
  const names = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  return names.map((weekday) => weekday === "MONDAY" && mondayPeriods.length
    ? { weekday, status: "OPEN", periods: mondayPeriods, note: "" }
    : { weekday, status: "UNKNOWN", periods: [], note: "Brak potwierdzonych godzin" });
}

function placePayload(organizationId, id) {
  return {
    ...(id ? { id } : {}),
    name: id ? `TEST Nocleg admin poprawiony ${stamp}` : `TEST Nocleg admin ${stamp}`,
    slug: manualSlug,
    organizationId,
    primaryCategorySlug: "nocleg",
    categorySlugs: ["nocleg", "higiena"],
    typeLabel: "Schronisko",
    description: "TEST rekord utworzony przez integracyjny formularz administratora.",
    street: "Testowa",
    buildingNumber: id ? "12" : "1200",
    addressLine: id ? "ul. Testowa 12, Łódź" : "ul. Testowa 1200, Łódź",
    postalCode: "90-001",
    city: "Łódź",
    district: "Śródmieście",
    latitude: 51.7601,
    longitude: 19.4561,
    phone: "+48421234567",
    email: "test-place@example.com",
    website: "https://example.com/test-place",
    socialMedia: "",
    publicationStatus: "DRAFT",
    operationalStatus: "OPEN_TODAY",
    todayHoursLabel: "Dzisiaj 18:00-22:00",
    audience: ["mężczyźni", "osoby w kryzysie bezdomności"],
    services: ["nocleg", "prysznic"],
    openingHours: {
      operation: days(id ? [{ opensAt: "08:00", closesAt: "12:00" }, { opensAt: "14:00", closesAt: "18:00" }] : [{ opensAt: "08:00", closesAt: "16:00" }]),
      admission: days([{ opensAt: "18:00", closesAt: "22:00" }]),
    },
    requirements: [
      { kind: "REFERRAL", state: "NO", label: "Skierowanie niewymagane", note: "" },
      { kind: "DOCUMENT", state: "UNKNOWN", label: "Dokument", note: "Do potwierdzenia" },
      { kind: "FEE", state: "NO", label: "Bezpłatnie", note: "" },
      { kind: "LODZ_REGISTRATION", state: "UNKNOWN", label: "Ostatni meldunek w Łodzi", note: "" },
      { kind: "APPOINTMENT", state: "NO", label: "Wcześniejsze umówienie niewymagane", note: "" },
    ],
    accessibility: [
      { feature: "STEP_FREE_ENTRANCE", state: "YES", label: "Wejście bez stopni", note: "" },
      { feature: "WHEELCHAIR_PLACE", state: "UNKNOWN", label: "Miejsce dla osoby na wózku", note: "Do potwierdzenia" },
    ],
    isAccommodation: true,
    accommodation: {
      type: "SHELTER",
      audienceLabel: "dla mężczyzn",
      targetGroups: ["mężczyźni"],
      acceptedProfiles: ["man", "other"],
      admissionHoursDescription: "Przyjęcia dzisiaj do 22:00",
      acceptsToday: "YES",
      lodzRegistrationRequired: "UNKNOWN",
      referralRequired: "NO",
      documentRequired: "UNKNOWN",
      sobrietyPolicy: "INDIVIDUAL_ASSESSMENT",
      sobrietyNote: "Ocena na miejscu",
      petPolicy: "BY_ARRANGEMENT",
      petNote: "Po kontakcie telefonicznym",
      wheelchairAccessibility: "UNKNOWN",
      careServices: "NO",
      partialDependencySupport: "UNKNOWN",
      mealsInfo: "Ciepły napój rano",
      hygieneInfo: "Prysznic w godzinach dyżuru",
      luggageInfo: "Szafka na noc",
      returnTimeInfo: "Do 22:00",
      maxStayInfo: "Do 30 dni po rozmowie",
      feeInfo: "Bezpłatnie",
      availabilityState: "AVAILABLE",
      availabilityLabel: id ? "3 wolne miejsca" : "4 wolne miejsca",
      availabilityNote: "TEST aktualizacja administratora",
      importantNote: "Informacja o wolnych miejscach nie jest gwarancją przyjęcia.",
      capacityGroups: [{ ...(id ? { id: undefined } : {}), label: "Mężczyźni", totalBeds: 40, availableBeds: id ? 3 : 4 }],
    },
    markVerified: Boolean(id),
    ...(id ? { verificationSource: "PHONE_CALL" } : {}),
    internalNote: "TEST integracyjny",
  };
}

async function savePlace(cookie, payload, path) {
  const html = await getHtml(path, cookie);
  const form = findForm(html, (fields) => fields.has("payload"));
  await submitAction(path, cookie, form, { payload: JSON.stringify(payload) });
}

async function submitJson(path, value) {
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
  assert.ok([200, 201].includes(response.status), `${path} returned ${response.status}`);
  return response.json();
}

async function publishDraft(cookie, submissionId, transform) {
  const path = `/admin/zgloszenia/${submissionId}`;
  const html = await getHtml(path, cookie);
  const form = findForm(html, (fields, body) => fields.has("draftId") && fields.has("items") && body.includes('name="note"'));
  const items = JSON.parse(form.get("items"));
  transform(items);
  await submitAction(path, cookie, form, { items: JSON.stringify(items), note: "TEST publikacja integracyjna" });
}

async function testStaleDraft(cookie, place) {
  const result = await submitJson("/api/submissions/place-update", {
    requestId: crypto.randomUUID(),
    placeId: place.id,
    placeSlug: place.slug,
    placeReference: place.name,
    reportTypes: ["phone"],
    description: "TEST konflikt wersji miejsca.",
    proposedData: { phone: "+48509999888", hours: "", address: "", closedSince: "" },
    source: { type: "phone", url: "" },
    submitterContact: { name: "TEST Konflikt", email: "test@example.com", phone: "" },
    protection: { contactWebsite: "" },
  });
  const path = `/admin/zgloszenia/${result.id}`;
  const html = await getHtml(path, cookie);
  const form = findForm(html, (fields, body) => fields.has("draftId") && fields.has("items") && body.includes('name="note"'));
  const items = JSON.parse(form.get("items"));
  const phone = items.find((item) => item.fieldKey === "phone");
  phone.workingValue = "+48 509 999 888";
  phone.decision = "INCLUDE";
  await prisma.place.update({ where: { id: place.id }, data: { internalNote: `TEST konflikt ${stamp}` } });
  await submitAction(path, cookie, form, { items: JSON.stringify(items), note: "TEST konflikt" });
  const [submission, unchangedPlace, publicationLogs] = await Promise.all([
    prisma.placeUpdateSubmission.findUniqueOrThrow({ where: { id: result.id }, include: { draft: { include: { items: true } } } }),
    prisma.place.findUniqueOrThrow({ where: { id: place.id } }),
    prisma.auditLog.count({ where: { sourceReferenceId: result.id, action: "SUBMISSION_PUBLISHED" } }),
  ]);
  assert.equal(submission.publicationStatus, "NOT_PUBLISHED");
  assert.equal(submission.publishedPlaceId, null);
  assert.equal(unchangedPlace.phone, place.phone);
  assert.equal(publicationLogs, 0);
  assert.equal(submission.draft.items.find((item) => item.fieldKey === "phone").workingValue, "+48 509 999 888");
  const conflictHtml = await getHtml(path, cookie);
  assert.match(conflictHtml, /Dane miejsca zmieniły się od czasu rozpoczęcia moderacji/u);
  const rebaseForm = findForm(conflictHtml, (fields, body) => fields.get("draftId") === submission.draft.id && fields.has("items") && body.includes("rebase"));
  await submitAction(path, cookie, rebaseForm);
  const rebased = await prisma.submissionDraft.findUniqueOrThrow({ where: { id: submission.draft.id }, include: { items: true } });
  assert.equal(rebased.basePlaceUpdatedAt.getTime(), unchangedPlace.updatedAt.getTime());
  assert.equal(rebased.items.find((item) => item.fieldKey === "phone").workingValue, "+48 509 999 888");
  return result.id;
}

async function testTransactionalRollback(cookie, place) {
  const result = await submitJson("/api/submissions/place-update", {
    requestId: crypto.randomUUID(),
    placeId: place.id,
    placeSlug: place.slug,
    placeReference: place.name,
    reportTypes: ["phone"],
    description: "TEST rollback publikacji.",
    proposedData: { phone: "+48507777666", hours: "", address: "", closedSince: "" },
    source: { type: "phone", url: "" },
    submitterContact: { name: "TEST Rollback", email: "test@example.com", phone: "" },
    protection: { contactWebsite: "" },
  });
  const path = `/admin/zgloszenia/${result.id}`;
  await getHtml(path, cookie);
  const draft = await prisma.submissionDraft.findFirstOrThrow({ where: { placeUpdateSubmissionId: result.id }, include: { items: true } });
  await prisma.submissionDraftItem.create({ data: {
    submissionDraftId: draft.id,
    fieldKey: "categorySlugs",
    label: "Kategorie",
    currentValueSnapshot: "nocleg\nhigiena",
    userValueSnapshot: "nieistniejaca-kategoria-testowa",
    workingValue: "nieistniejaca-kategoria-testowa",
    decision: "INCLUDE",
    sortOrder: 99,
  } });
  const html = await getHtml(path, cookie);
  const form = findForm(html, (fields, body) => fields.has("draftId") && fields.has("items") && body.includes('name="note"'));
  const items = JSON.parse(form.get("items"));
  const phone = items.find((item) => item.fieldKey === "phone");
  phone.workingValue = "+48 507 777 666";
  phone.decision = "INCLUDE";
  await submitAction(path, cookie, form, { items: JSON.stringify(items), note: "TEST rollback" });
  const [submission, unchangedPlace, publicationLogs] = await Promise.all([
    prisma.placeUpdateSubmission.findUniqueOrThrow({ where: { id: result.id } }),
    prisma.place.findUniqueOrThrow({ where: { id: place.id } }),
    prisma.auditLog.count({ where: { sourceReferenceId: result.id } }),
  ]);
  assert.equal(submission.publicationStatus, "NOT_PUBLISHED");
  assert.equal(submission.publishedPlaceId, null);
  assert.equal(unchangedPlace.phone, place.phone);
  assert.equal(publicationLogs, 0);
  return result.id;
}

async function testLegacyApprovedPreparation(cookie) {
  const legacy = await prisma.placeUpdateSubmission.findFirst({
    where: { moderationStatus: "APPROVED", publicationStatus: "NOT_PUBLISHED", publishedPlaceId: null },
    include: { draft: true },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(legacy, "Expected an older approved, unpublished submission.");
  const path = `/admin/zgloszenia/${legacy.id}`;
  const html = await getHtml(path, cookie);
  if (!legacy.draft) {
    assert.match(html, /Przygotuj do publikacji/u);
    const form = findForm(html, (fields) => fields.get("submissionId") === legacy.id);
    await submitAction(path, cookie, form);
  }
  const prepared = await prisma.placeUpdateSubmission.findUniqueOrThrow({ where: { id: legacy.id }, include: { draft: true } });
  assert.ok(prepared.draft);
  assert.equal(prepared.moderationStatus, "APPROVED");
  assert.equal(prepared.publicationStatus, "NOT_PUBLISHED");
  assert.equal(prepared.publishedPlaceId, null);
  return legacy.id;
}

async function main() {
  const cookie = await login();
  const organization = await prisma.organization.create({
    data: { slug: `test-organizacja-${stamp}`, name: `TEST Organizacja ${stamp}`, active: true },
  });

  await savePlace(cookie, placePayload(organization.id), "/admin/miejsca/nowe");
  let manualPlace = await prisma.place.findUniqueOrThrow({ where: { slug: manualSlug }, include: { accommodation: { include: { capacityGroups: true, availabilityHistory: true } } } });
  await prisma.place.update({ where: { id: manualPlace.id }, data: { recordKind: "TEST" } });
  const originalGroupId = manualPlace.accommodation.capacityGroups[0].id;
  const editedPayload = placePayload(organization.id, manualPlace.id);
  editedPayload.accommodation.capacityGroups[0].id = originalGroupId;
  await savePlace(cookie, editedPayload, `/admin/miejsca/${manualPlace.id}/edytuj`);
  manualPlace = await prisma.place.findUniqueOrThrow({ where: { id: manualPlace.id }, include: { categories: { include: { category: true } }, openingHours: true, requirements: true, accessibility: true, accommodation: { include: { capacityGroups: true, availabilityHistory: true } } } });
  assert.equal(manualPlace.name, `TEST Nocleg admin poprawiony ${stamp}`);
  assert.equal(manualPlace.addressLine, "ul. Testowa 12, Łódź");
  assert.equal(manualPlace.openingHours.filter((row) => row.kind === "OPERATION" && row.weekday === "MONDAY").length, 2);
  assert.equal(manualPlace.accommodation.capacityGroups[0].availableBeds, 3);
  assert.ok(manualPlace.accommodation.availabilityHistory.length >= 2);
  assert.equal(manualPlace.requirements.find((item) => item.kind === "DOCUMENT").state, "UNKNOWN");

  const detailHtml = await getHtml(`/admin/miejsca/${manualPlace.id}`, cookie);
  const publishForm = findForm(detailHtml, (fields) => fields.get("status") === "PUBLISHED");
  await submitAction(`/admin/miejsca/${manualPlace.id}`, cookie, publishForm);
  assert.equal((await prisma.place.findUniqueOrThrow({ where: { id: manualPlace.id } })).publicationStatus, "PUBLISHED");

  const oldRequirements = manualPlace.requirements.map((item) => item.label);
  const updateResult = await submitJson("/api/submissions/place-update", {
    requestId: crypto.randomUUID(),
    placeId: manualPlace.id,
    placeSlug: manualSlug,
    placeReference: manualPlace.name,
    reportTypes: ["phone", "hours", "requirements"],
    description: "TEST: nowy telefon, godziny i błędna propozycja warunku.",
    proposedData: { phone: "+48501111222", hours: "TEST niepublikowane godziny", address: "", closedSince: "" },
    source: { type: "phone", url: "" },
    submitterContact: { name: "TEST Zgłaszający", email: "test@example.com", phone: "" },
    protection: { contactWebsite: "" },
  });
  await publishDraft(cookie, updateResult.id, (items) => {
    for (const item of items) {
      if (item.fieldKey === "phone") { item.workingValue = "+48 501 111 222"; item.decision = "INCLUDE"; }
      if (item.fieldKey === "openingHours.operation") {
        item.workingValue = days([{ opensAt: "09:00", closesAt: "13:00" }, { opensAt: "15:00", closesAt: "19:00" }]);
        item.decision = "INCLUDE";
      }
      if (item.fieldKey === "requirementsText") item.decision = "REJECT";
    }
  });
  const updatedPlace = await prisma.place.findUniqueOrThrow({ where: { id: manualPlace.id }, include: { openingHours: true, requirements: true } });
  const updateSubmission = await prisma.placeUpdateSubmission.findUniqueOrThrow({ where: { id: updateResult.id } });
  assert.equal(updatedPlace.phone, "+48 501 111 222");
  assert.deepEqual(updatedPlace.openingHours.filter((row) => row.kind === "OPERATION" && row.weekday === "MONDAY").map((row) => [row.opensAt, row.closesAt]), [["09:00", "13:00"], ["15:00", "19:00"]]);
  assert.deepEqual(updatedPlace.requirements.map((item) => item.label), oldRequirements);
  assert.equal(updateSubmission.moderationStatus, "APPROVED");
  assert.equal(updateSubmission.publicationStatus, "PUBLISHED");
  assert.equal(updateSubmission.publishedPlaceId, manualPlace.id);

  const newResult = await submitJson("/api/submissions/new-place", {
    requestId: crypto.randomUUID(),
    proposedData: {
      name: newPlaceName,
      organizationName: `TEST Nowa organizacja ${stamp}`,
      helpCategories: ["food"],
      address: { street: "ul. Piotrkowska 1200", postalCode: "90-001", city: "Łódź", district: "Śródmieście" },
      placeContact: { phone: "+48429999999", email: "new-test@example.com", website: "https://example.com/new-test" },
      openingHours: "Poniedziałek 10:00-16:00",
      description: "TEST nowe miejsce z publicznego zgłoszenia.",
      conditions: ["Bez skierowania"],
    },
    source: { type: "recommendation", url: "" },
    submitterContact: { name: "TEST Zgłaszający", email: "test@example.com", phone: "" },
    protection: { contactWebsite: "" },
  });
  await publishDraft(cookie, newResult.id, (items) => {
    const address = items.find((item) => item.fieldKey === "addressLine");
    address.workingValue = "ul. Piotrkowska 120, Łódź";
    address.decision = "INCLUDE";
    const hours = items.find((item) => item.fieldKey === "openingHours.operation");
    if (hours) {
      hours.workingValue = days([{ opensAt: "10:00", closesAt: "16:00" }]);
      hours.decision = "INCLUDE";
    }
  });
  const newSubmission = await prisma.newPlaceSubmission.findUniqueOrThrow({ where: { id: newResult.id }, include: { publishedPlace: true } });
  assert.equal(newSubmission.moderationStatus, "APPROVED");
  assert.equal(newSubmission.publicationStatus, "PUBLISHED");
  assert.equal(newSubmission.publishedPlace.addressLine, "ul. Piotrkowska 120, Łódź");
  assert.equal(newSubmission.publishedPlace.publicationStatus, "PUBLISHED");
  const publishedHours = await prisma.openingHours.findMany({ where: { placeId: newSubmission.publishedPlaceId, kind: "OPERATION", weekday: "MONDAY" }, orderBy: { sortOrder: "asc" } });
  assert.deepEqual(publishedHours.map((row) => [row.opensAt, row.closesAt]), [["10:00", "16:00"]]);
  await prisma.place.update({ where: { id: newSubmission.publishedPlaceId }, data: { recordKind: "TEST" } });

  const publicationAudit = await prisma.auditLog.findFirstOrThrow({ where: { sourceReferenceId: updateResult.id, action: "SUBMISSION_PUBLISHED" } });
  assert.deepEqual(publicationAudit.newValues.rejectedFields, ["requirementsText"]);
  const staleSubmissionId = await testStaleDraft(cookie, updatedPlace);
  const rollbackSubmissionId = await testTransactionalRollback(cookie, await prisma.place.findUniqueOrThrow({ where: { id: updatedPlace.id } }));
  const legacyApprovedSubmissionId = await testLegacyApprovedPreparation(cookie);

  const auditCount = await prisma.auditLog.count({ where: { OR: [{ entityId: manualPlace.id }, { sourceReferenceId: { in: [updateResult.id, newResult.id] } }] } });
  assert.ok(auditCount >= 7);

  console.log(JSON.stringify({
    manualPlaceId: manualPlace.id,
    manualPlaceSlug: manualSlug,
    updateSubmissionId: updateResult.id,
    newPlaceSubmissionId: newResult.id,
    publishedNewPlaceId: newSubmission.publishedPlaceId,
    partialApproval: { phonePublished: true, structuredHoursPublished: true, requirementsRejected: true },
    availabilityHistory: manualPlace.accommodation.availabilityHistory.length,
    relatedAuditLogs: auditCount,
    structuralOpeningHours: true,
    staleDraftBlocked: staleSubmissionId,
    transactionRolledBack: rollbackSubmissionId,
    legacyApprovedPrepared: legacyApprovedSubmissionId,
  }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}

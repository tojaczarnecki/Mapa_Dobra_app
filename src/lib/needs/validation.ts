const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function text(value: unknown, max: number, required = false) {
  if (typeof value !== "string") return required ? null : undefined;
  const normalized = value.trim();
  if (!normalized && required) return null;
  return normalized.length <= max ? normalized || undefined : null;
}

function date(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type NeedInput = {
  title: string;
  description: string;
  peopleNeeded: number;
  startsAt: Date;
  endsAt: Date;
  signupDeadline: Date | null;
  experienceRequired: boolean;
  requirements: string | null;
  locationNote: string | null;
};

export function validateNeedInput(input: unknown): { ok: true; data: NeedInput } | { ok: false; message: string } {
  if (!input || typeof input !== "object") return { ok: false, message: "Uzupełnij dane potrzeby." };
  const value = input as Record<string, unknown>;
  const title = text(value.title, 180, true);
  const description = text(value.description, 1000, true);
  const startsAt = date(value.startsAt);
  const endsAt = date(value.endsAt);
  const peopleNeeded = Number(value.peopleNeeded);
  const requirements = text(value.requirements, 500);
  const locationNote = text(value.locationNote, 300);
  if (!title || title.length < 3 || !description || description.length < 5) return { ok: false, message: "Dodaj krótki tytuł i opis potrzeby." };
  if (!startsAt || !endsAt || endsAt <= startsAt) return { ok: false, message: "Sprawdź datę i godziny potrzeby." };
  if (!Number.isInteger(peopleNeeded) || peopleNeeded < 1 || peopleNeeded > 1000) return { ok: false, message: "Podaj liczbę osób od 1 do 1000." };
  if (requirements === null || locationNote === null) return { ok: false, message: "Sprawdź długość dodatkowych informacji." };
  const signupDeadline = value.signupDeadline ? date(value.signupDeadline) : null;
  if (value.signupDeadline && !signupDeadline) return { ok: false, message: "Sprawdź termin zgłoszeń." };
  if (signupDeadline && signupDeadline > endsAt) return { ok: false, message: "Termin zgłoszeń nie może przypadać po zakończeniu potrzeby." };
  return { ok: true, data: { title, description, peopleNeeded, startsAt, endsAt, signupDeadline, experienceRequired: value.experienceRequired === true || value.experienceRequired === "true", requirements: requirements ?? null, locationNote: locationNote ?? null } };
}

export type VolunteerResponseInput = { firstName: string; phone: string | null; email: string | null; note: string | null };

export function validateVolunteerResponse(input: unknown): { ok: true; data: VolunteerResponseInput } | { ok: false; message: string } {
  if (!input || typeof input !== "object") return { ok: false, message: "Uzupełnij dane kontaktowe." };
  const value = input as Record<string, unknown>;
  const firstName = text(value.firstName, 120, true);
  const phone = text(value.phone, 50) ?? null;
  const email = text(value.email, 320) ?? null;
  const note = text(value.note, 500) ?? null;
  if (!firstName || firstName.length < 2 || (!phone && !email)) return { ok: false, message: "Podaj imię oraz telefon lub e-mail." };
  if (email && !emailPattern.test(email)) return { ok: false, message: "Podaj poprawny adres e-mail." };
  return { ok: true, data: { firstName, phone, email, note } };
}

export function confirmedResponseCount(statuses: readonly string[]) {
  return statuses.filter((status) => status === "CONFIRMED").length;
}

export function confirmedCountAfterTransition(currentCount: number, previousStatus: string, nextStatus: string) {
  return Math.max(0, currentCount - (previousStatus === "CONFIRMED" ? 1 : 0) + (nextStatus === "CONFIRMED" ? 1 : 0));
}

export function shouldReopenFilledNeed(needStatus: string, previousResponseStatus: string, nextStatus: string, confirmedCount: number, peopleNeeded: number) {
  return needStatus === "FILLED" && previousResponseStatus === "CONFIRMED" && nextStatus === "NEW" && confirmedCount < peopleNeeded;
}

export function canDecideVolunteerResponse(needStatus: string, responseStatus: string, nextStatus: string) {
  return needStatus === "PUBLISHED" && responseStatus === "NEW" && (nextStatus === "CONFIRMED" || nextStatus === "DECLINED");
}

export function remainingPeople(peopleNeeded: number, responseCount: number) {
  return Math.max(0, peopleNeeded - Math.max(0, responseCount));
}

export function experienceRequirementLabel(experienceRequired: boolean) {
  return experienceRequired ? "Wymagane doświadczenie" : "Bez doświadczenia";
}

export function needHasAvailableCapacity(peopleNeeded: number, confirmedCount: number) {
  return confirmedCount < peopleNeeded;
}

export function statusAfterConfirmedResponse(needStatus: string, peopleNeeded: number, confirmedCount: number) {
  return needStatus === "PUBLISHED" && !needHasAvailableCapacity(peopleNeeded, confirmedCount) ? "FILLED" : needStatus;
}

export function statusAfterCapacityEdit(needStatus: string, peopleNeeded: number, confirmedCount: number) {
  if (confirmedCount > peopleNeeded) return { ok: false as const, reason: "BELOW_CONFIRMED" as const };
  if (needStatus === "PUBLISHED" && confirmedCount === peopleNeeded) return { ok: true as const, status: "FILLED" as const };
  return { ok: true as const, status: needStatus };
}

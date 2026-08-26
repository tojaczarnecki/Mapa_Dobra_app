import type { CategoryFormValue, OrganizationFormValue } from "@/types/admin-directory";
import { normalizeHttpUrl } from "../urls.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function text(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

export function normalizeOrganizationName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pl-PL")
    .replace(/ł/gu, "l")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? 0;
}

export function compareOrganizationNames(candidate: string, existing: string): "same" | "similar" | "different" {
  const left = normalizeOrganizationName(candidate);
  const right = normalizeOrganizationName(existing);
  if (left === right) return "same";
  if (!left || !right) return "different";
  const longest = Math.max(left.length, right.length);
  const distance = editDistance(left, right);
  if (distance <= Math.max(1, Math.floor(longest * 0.12))) return "similar";
  if (Math.min(left.length, right.length) >= 8 && (left.includes(right) || right.includes(left))) return "similar";
  return "different";
}

export function slugifyDirectoryValue(value: string, maxLength = 120) {
  return normalizeOrganizationName(value).replace(/\s+/gu, "-").slice(0, maxLength).replace(/-$/u, "");
}

export function validateOrganizationForm(formData: FormData):
  | { ok: true; data: OrganizationFormValue }
  | { ok: false; error: string } {
  const id = text(formData.get("id"), 36);
  const name = text(formData.get("name"), 250);
  const description = text(formData.get("description"), 2000);
  const phone = text(formData.get("phone"), 50);
  const email = text(formData.get("email"), 320);
  const website = text(formData.get("website"), 2048);
  if ((id && !uuidPattern.test(id)) || !name || name.length < 2 || description === null || phone === null || email === null || website === null) {
    return { ok: false, error: "Sprawdź wymagane pola i limity długości." };
  }
  if (email && !emailPattern.test(email)) return { ok: false, error: "Podaj poprawny adres e-mail." };
  const normalizedWebsite = website ? normalizeHttpUrl(website) : null;
  if (website && !normalizedWebsite) return { ok: false, error: "Wpisz poprawny adres strony, np. mapadobra.pl" };
  return { ok: true, data: { id: id || undefined, name, description, phone, email, website: normalizedWebsite ?? "" } };
}

export function validateCategoryForm(formData: FormData):
  | { ok: true; data: CategoryFormValue }
  | { ok: false; error: string } {
  const id = text(formData.get("id"), 36);
  const name = text(formData.get("name"), 160);
  const slug = text(formData.get("slug"), 120);
  const rawSortOrder = text(formData.get("sortOrder"), 10);
  const sortOrder = rawSortOrder === "" ? null : Number(rawSortOrder);
  if (
    (id && !uuidPattern.test(id)) ||
    !name ||
    name.length < 2 ||
    !slug ||
    !slugPattern.test(slug) ||
    sortOrder === null && rawSortOrder === null ||
    sortOrder !== null && (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100_000)
  ) {
    return { ok: false, error: "Sprawdź nazwę, slug i kolejność kategorii." };
  }
  return {
    ok: true,
    data: {
      id: id || undefined,
      name,
      slug,
      sortOrder,
      active: formData.get("active") === "on",
    },
  };
}

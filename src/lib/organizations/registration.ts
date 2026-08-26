import { compareOrganizationNames } from "../admin/directory-validation.ts";
import { normalizeNip } from "../structured-data.ts";

export const organizationRegistrationStatuses = ["EMAIL_PENDING", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"] as const;

export function normalizeOrganizationEmail(value: string) {
  return value.trim().toLocaleLowerCase("pl-PL").slice(0, 320);
}

export function organizationRegistrationInput(input: Record<string, unknown>) {
  const organizationName = typeof input.organizationName === "string" ? input.organizationName.trim().slice(0, 250) : "";
  const applicantName = typeof input.applicantName === "string" ? input.applicantName.trim().slice(0, 160) : "";
  const organizationEmail = typeof input.organizationEmail === "string" ? normalizeOrganizationEmail(input.organizationEmail) : "";
  const applicantEmailValue = typeof input.email === "string" ? input.email : input.applicantEmail;
  const applicantEmail = typeof applicantEmailValue === "string" ? normalizeOrganizationEmail(applicantEmailValue) : "";
  const jobTitle = typeof input.jobTitle === "string" ? input.jobTitle : typeof input.applicantPosition === "string" ? input.applicantPosition : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (organizationName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(organizationEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(applicantEmail) || applicantName.length < 2 || password.length < 12) return null;
  const nip = typeof input.nip === "string" && input.nip.trim() ? normalizeNip(input.nip) : null;
  if (typeof input.nip === "string" && input.nip.trim() && !nip) return null;
  return {
    organizationName,
    applicantName,
    organizationEmail,
    applicantEmail,
    password,
    nip,
    website: typeof input.website === "string" ? input.website.trim().slice(0, 2048) : null,
    organizationPhone: typeof input.organizationPhone === "string" ? input.organizationPhone.trim().slice(0, 50) : null,
    applicantPhone: typeof input.applicantPhone === "string" ? input.applicantPhone.trim().slice(0, 50) : null,
    applicantPosition: jobTitle.trim().slice(0, 160) || null,
  };
}

export function possibleOrganization<T extends { name: string }>(name: string, organizations: T[]) {
  return organizations.find((organization) => compareOrganizationNames(name, organization.name) !== "different") ?? null;
}

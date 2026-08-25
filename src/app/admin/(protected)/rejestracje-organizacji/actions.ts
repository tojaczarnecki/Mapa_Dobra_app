"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AdminPermission } from "@/generated/prisma/enums";
import { compareOrganizationNames, slugifyDirectoryValue } from "@/lib/admin/directory-validation";

const claimPermissions: AdminPermission[] = ["UPDATE_BED_AVAILABILITY", "UPDATE_ADMISSION_STATUS", "UPDATE_ADMISSION_HOURS", "UPDATE_PLACE_CONTACT", "UPDATE_PLACE_BASIC", "UPDATE_ACCOMMODATION_DETAILS", "UPDATE_TOTAL_CAPACITY"];

async function uniqueOrganizationSlug(transaction: Prisma.TransactionClient, name: string) {
  const base = slugifyDirectoryValue(name, 190) || "organizacja";
  let slug = base;
  let suffix = 2;
  while (await transaction.organization.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base.slice(0, 190 - String(suffix).length)}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function reviewOrganizationRegistration(formData: FormData) {
  const session = await requirePermission("MANAGE_ORGANIZATIONS");
  const id = formData.get("id");
  const decision = formData.get("decision");
  const organizationId = typeof formData.get("organizationId") === "string" ? String(formData.get("organizationId")) : "";
  const rejectionReason = typeof formData.get("rejectionReason") === "string" ? String(formData.get("rejectionReason")).trim().slice(0, 1000) : "";
  if (typeof id !== "string" || !["approve", "reject"].includes(String(decision))) return;
  try {
    await prisma.$transaction(async (transaction) => {
      const registration = await transaction.organizationRegistration.findUnique({ where: { id } });
      if (!registration || registration.status !== "PENDING_REVIEW") throw new Error("NOT_FOUND");
      const approved = decision === "approve";
      let assignedOrganizationId = approved ? organizationId || registration.organizationId || "" : registration.organizationId;
      if (approved && !assignedOrganizationId) throw new Error("ORGANIZATION_REQUIRED");
      if (approved && assignedOrganizationId === "__new__") {
        const possibleDuplicates = await transaction.organization.findMany({ where: { active: true }, select: { id: true, name: true } });
        if (possibleDuplicates.some((organization) => compareOrganizationNames(registration.organizationName, organization.name) === "same")) throw new Error("ORGANIZATION_DUPLICATE");
        const created = await transaction.organization.create({ data: { slug: await uniqueOrganizationSlug(transaction, registration.organizationName), name: registration.organizationName, phone: registration.organizationPhone ?? undefined, email: registration.organizationEmail ?? undefined, website: registration.website ?? undefined } });
        assignedOrganizationId = created.id;
        await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: "ORGANIZATION_CREATED", entityType: "ORGANIZATION", entityId: created.id, changedFields: ["name", "phone", "email", "website"], newValues: { name: created.name, source: "ORGANIZATION_REGISTRATION" }, changeOrigin: "ADMIN_MANUAL" } });
      }
      if (approved) {
        const approvedOrganizationId = assignedOrganizationId;
        if (!approvedOrganizationId) throw new Error("ORGANIZATION_REQUIRED");
        const organization = await transaction.organization.findFirst({ where: { id: approvedOrganizationId, active: true }, select: { id: true } });
        if (!organization) throw new Error("ORGANIZATION_REQUIRED");
        await transaction.organizationMembership.upsert({ where: { organizationId_adminUserId: { organizationId: approvedOrganizationId, adminUserId: registration.adminUserId } }, create: { organizationId: approvedOrganizationId, adminUserId: registration.adminUserId, status: "ACTIVE" }, update: { status: "ACTIVE" } });
      }
      await transaction.organizationRegistration.update({ where: { id }, data: { status: approved ? "APPROVED" : "REJECTED", organizationId: approved ? assignedOrganizationId : registration.organizationId, rejectionReason: approved ? null : rejectionReason || "Nie udało się potwierdzić reprezentacji organizacji.", reviewedByAdminId: session.user.id, reviewedAt: new Date() } });
      await transaction.adminUser.update({ where: { id: registration.adminUserId }, data: { active: approved } });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: approved ? "ORGANIZATION_REGISTRATION_APPROVED" : "ORGANIZATION_REGISTRATION_REJECTED", entityType: "ORGANIZATION_REGISTRATION", entityId: id, changedFields: ["status", "organizationId", "reviewedByAdminId"], newValues: { status: approved ? "APPROVED" : "REJECTED", organizationId: approved ? assignedOrganizationId : registration.organizationId }, changeOrigin: "ADMIN_MANUAL" } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_REQUIRED") redirect("/admin/rejestracje-organizacji?error=organization-required");
    if (error instanceof Error && error.message === "ORGANIZATION_DUPLICATE") redirect("/admin/rejestracje-organizacji?error=organization-duplicate");
    throw error;
  }
  revalidatePath("/admin/rejestracje-organizacji");
}

export async function reviewPlaceAccessRequest(formData: FormData) {
  const session = await requirePermission("MANAGE_ORGANIZATIONS");
  const id = formData.get("id");
  const decision = formData.get("decision");
  if (typeof id !== "string" || !["approve", "reject"].includes(String(decision))) return;
  const rawPermissions = typeof formData.get("permissions") === "string" ? String(formData.get("permissions")) : "[]";
  let permissions: AdminPermission[] = [];
  try { const parsed = JSON.parse(rawPermissions) as unknown; if (Array.isArray(parsed)) permissions = [...new Set(parsed)].filter((value): value is AdminPermission => typeof value === "string" && claimPermissions.includes(value as AdminPermission)); } catch { return; }
  if (decision === "approve" && permissions.length === 0) return;
  try {
    await prisma.$transaction(async (transaction) => {
    const request = await transaction.placeAccessRequest.findUnique({ where: { id }, include: { place: { select: { organizationId: true } } } });
    if (!request || request.status !== "PENDING") throw new Error("NOT_FOUND");
    const approved = decision === "approve";
    const membership = request.organizationId
      ? await transaction.organizationMembership.findUnique({ where: { organizationId_adminUserId: { organizationId: request.organizationId, adminUserId: request.requestingUserId } }, select: { status: true } })
      : null;
    if (approved && (!membership || membership.status !== "ACTIVE")) throw new Error("ORGANIZATION_MISMATCH");
    if (approved && request.organizationId && request.place.organizationId && request.organizationId !== request.place.organizationId) throw new Error("ORGANIZATION_MISMATCH");
    if (approved) await transaction.userPlaceAccess.upsert({ where: { adminUserId_placeId: { adminUserId: request.requestingUserId, placeId: request.placeId } }, create: { adminUserId: request.requestingUserId, placeId: request.placeId, permissions: permissions.length ? permissions : ["UPDATE_BED_AVAILABILITY", "UPDATE_ADMISSION_STATUS", "UPDATE_ADMISSION_HOURS"], createdByAdminId: session.user.id }, update: { active: true, permissions: permissions.length ? permissions : ["UPDATE_BED_AVAILABILITY", "UPDATE_ADMISSION_STATUS", "UPDATE_ADMISSION_HOURS"], createdByAdminId: session.user.id } });
    await transaction.placeAccessRequest.update({ where: { id }, data: { status: approved ? "APPROVED" : "REJECTED", reviewedByAdminId: session.user.id, reviewedAt: new Date() } });
    await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: approved ? "PLACE_ACCESS_APPROVED" : "PLACE_ACCESS_REJECTED", entityType: "PLACE_ACCESS_REQUEST", entityId: id, changedFields: ["status", "permissions"], newValues: { status: approved ? "APPROVED" : "REJECTED", permissions }, changeOrigin: "ADMIN_MANUAL" } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORGANIZATION_MISMATCH") return;
    throw error;
  }
  revalidatePath("/admin/rejestracje-organizacji");
}

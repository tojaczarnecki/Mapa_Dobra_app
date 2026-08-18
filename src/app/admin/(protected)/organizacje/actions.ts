"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/admin/session";
import {
  compareOrganizationNames,
  slugifyDirectoryValue,
  validateOrganizationForm,
} from "@/lib/admin/directory-validation";
import { prisma } from "@/lib/prisma";
import type { DirectoryActionState } from "@/types/admin-directory";

async function uniqueOrganizationSlug(transaction: Prisma.TransactionClient, name: string) {
  const base = slugifyDirectoryValue(name, 190) || "organizacja";
  let candidate = base;
  let suffix = 2;
  while (await transaction.organization.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base.slice(0, 190 - String(suffix).length)}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function saveOrganization(
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const session = await requirePermission("MANAGE_ORGANIZATIONS");
  const validation = validateOrganizationForm(formData);
  if (!validation.ok) return { error: validation.error };
  const input = validation.data;

  try {
    const organizationId = await prisma.$transaction(async (transaction) => {
      const existing = input.id
        ? await transaction.organization.findUnique({ where: { id: input.id } })
        : null;
      if (input.id && !existing) throw new Error("NOT_FOUND");

      const organizations = await transaction.organization.findMany({
        where: input.id ? { id: { not: input.id } } : undefined,
        select: { id: true, name: true },
      });
      const identical = organizations.find((item) => compareOrganizationNames(input.name, item.name) === "same");
      if (identical) throw new Error("DUPLICATE_NAME");
      const similar = organizations.find((item) => compareOrganizationNames(input.name, item.name) === "similar");
      if (similar && formData.get("confirmSimilar") !== "yes") {
        throw new Error(`SIMILAR:${similar.name}`);
      }

      const values = {
        name: input.name,
        description: input.description || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
      };
      const saved = existing
        ? await transaction.organization.update({ where: { id: existing.id }, data: values })
        : await transaction.organization.create({
            data: { ...values, slug: await uniqueOrganizationSlug(transaction, input.name) },
          });
      const previousValues = existing
        ? { name: existing.name, description: existing.description, phone: existing.phone, email: existing.email, website: existing.website, active: existing.active }
        : null;
      const newValues = { ...values, active: saved.active };
      const changedFields = Object.keys(newValues).filter((key) => (
        JSON.stringify(previousValues?.[key as keyof typeof previousValues]) !== JSON.stringify(newValues[key as keyof typeof newValues])
      ));
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: existing ? "ORGANIZATION_UPDATED" : "ORGANIZATION_CREATED",
          entityType: "ORGANIZATION",
          entityId: saved.id,
          changedFields,
          previousValues: previousValues ? previousValues as Prisma.InputJsonValue : Prisma.JsonNull,
          newValues: newValues as Prisma.InputJsonValue,
          changeOrigin: "ADMIN_MANUAL",
        },
      });
      return saved.id;
    });

    revalidatePath("/admin/organizacje");
    revalidatePath(`/admin/organizacje/${organizationId}`);
    revalidatePath("/admin/miejsca");
    return { success: "Organizacja została zapisana.", entityId: organizationId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "DUPLICATE_NAME") return { error: "Organizacja o identycznej nazwie już istnieje." };
    if (reason.startsWith("SIMILAR:")) return { warning: `Podobna organizacja już istnieje: ${reason.slice(8)}.` };
    return { error: "Nie udało się zapisać organizacji. Spróbuj ponownie." };
  }
}

export async function setOrganizationActive(
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const session = await requirePermission("MANAGE_ORGANIZATIONS");
  const id = formData.get("id");
  const targetActive = formData.get("active") === "true";
  if (typeof id !== "string") return { error: "Nie udało się zmienić statusu organizacji." };

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.organization.findUnique({
        where: { id },
        include: { _count: { select: { places: true } } },
      });
      if (!current) throw new Error("NOT_FOUND");
      if (!targetActive && current._count.places > 0) throw new Error("HAS_PLACES");
      if (current.active === targetActive) return;
      await transaction.organization.update({ where: { id }, data: { active: targetActive } });
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action: targetActive ? "ORGANIZATION_RESTORED" : "ORGANIZATION_ARCHIVED",
          entityType: "ORGANIZATION",
          entityId: id,
          changedFields: ["active"],
          previousValues: { active: current.active },
          newValues: { active: targetActive },
          changeOrigin: "ADMIN_MANUAL",
        },
      });
    });
    revalidatePath("/admin/organizacje");
    revalidatePath(`/admin/organizacje/${id}`);
    return { success: targetActive ? "Organizacja została przywrócona." : "Organizacja została zarchiwizowana." };
  } catch (error) {
    if (error instanceof Error && error.message === "HAS_PLACES") {
      return { error: "Nie można zarchiwizować organizacji, która prowadzi miejsca." };
    }
    return { error: "Nie udało się zmienić statusu organizacji." };
  }
}

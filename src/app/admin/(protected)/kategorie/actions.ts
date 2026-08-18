"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/session";
import { validateCategoryForm } from "@/lib/admin/directory-validation";
import { prisma } from "@/lib/prisma";
import type { DirectoryActionState } from "@/types/admin-directory";

export async function saveCategory(
  _previousState: DirectoryActionState,
  formData: FormData,
): Promise<DirectoryActionState> {
  const session = await requireAdmin();
  const validation = validateCategoryForm(formData);
  if (!validation.ok) return { error: validation.error };
  const input = validation.data;

  try {
    const categoryId = await prisma.$transaction(async (transaction) => {
      const existing = input.id
        ? await transaction.category.findUnique({
            where: { id: input.id },
            include: {
              _count: { select: { placeLinks: true, primaryPlaces: true } },
            },
          })
        : null;
      if (input.id && !existing) throw new Error("NOT_FOUND");
      if (existing && input.slug !== existing.slug) throw new Error("SLUG_LOCKED");
      const duplicateSlug = await transaction.category.findFirst({
        where: { slug: input.slug, ...(input.id ? { id: { not: input.id } } : {}) },
        select: { id: true },
      });
      if (duplicateSlug) throw new Error("DUPLICATE_SLUG");
      const duplicateName = await transaction.category.findFirst({
        where: { name: { equals: input.name, mode: "insensitive" }, ...(input.id ? { id: { not: input.id } } : {}) },
        select: { id: true },
      });
      if (duplicateName) throw new Error("DUPLICATE_NAME");
      if (
        existing?.active &&
        !input.active &&
        (existing._count.placeLinks > 0 || existing._count.primaryPlaces > 0) &&
        formData.get("confirmDeactivation") !== "yes"
      ) {
        throw new Error(`CONFIRM_DEACTIVATION:${existing._count.placeLinks}:${existing._count.primaryPlaces}`);
      }

      let sortOrder = input.sortOrder;
      if (sortOrder === null) {
        const last = await transaction.category.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
        sortOrder = (last?.sortOrder ?? 0) + 10;
      }
      const values = { name: input.name, sortOrder, active: input.active };
      const saved = existing
        ? await transaction.category.update({ where: { id: existing.id }, data: values })
        : await transaction.category.create({ data: { ...values, slug: input.slug } });
      const previousValues = existing
        ? { name: existing.name, slug: existing.slug, sortOrder: existing.sortOrder, active: existing.active }
        : null;
      const newValues = { name: saved.name, slug: saved.slug, sortOrder: saved.sortOrder, active: saved.active };
      const changedFields = Object.keys(newValues).filter((key) => (
        JSON.stringify(previousValues?.[key as keyof typeof previousValues]) !== JSON.stringify(newValues[key as keyof typeof newValues])
      ));
      const action = !existing
        ? "CATEGORY_CREATED"
        : existing.active !== saved.active
          ? saved.active ? "CATEGORY_ACTIVATED" : "CATEGORY_DEACTIVATED"
          : "CATEGORY_UPDATED";
      await transaction.auditLog.create({
        data: {
          adminUserId: session.user.id,
          action,
          entityType: "CATEGORY",
          entityId: saved.id,
          changedFields,
          previousValues: previousValues ? previousValues as Prisma.InputJsonValue : Prisma.JsonNull,
          newValues: newValues as Prisma.InputJsonValue,
          changeOrigin: "ADMIN_MANUAL",
        },
      });
      return saved.id;
    });

    revalidatePath("/admin/kategorie");
    revalidatePath("/admin/miejsca");
    revalidatePath("/szukaj");
    revalidatePath("/mapa");
    return { success: "Kategoria została zapisana.", entityId: categoryId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "SLUG_LOCKED") return { error: "Slug istniejącej kategorii jest zablokowany." };
    if (reason === "DUPLICATE_SLUG") return { error: "Kategoria o takim slugu już istnieje." };
    if (reason === "DUPLICATE_NAME") return { error: "Kategoria o takiej nazwie już istnieje." };
    if (reason.startsWith("CONFIRM_DEACTIVATION:")) {
      const [, places, primaryPlaces] = reason.split(":");
      return { warning: `Ta kategoria jest przypisana do ${places} miejsc, w tym jest główna dla ${primaryPlaces}. Potwierdź dezaktywację.` };
    }
    return { error: "Nie udało się zapisać kategorii. Spróbuj ponownie." };
  }
}

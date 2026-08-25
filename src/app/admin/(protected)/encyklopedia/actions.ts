"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/admin/session";
import { knowledgeFormData } from "@/lib/knowledge-admin";
import { prisma } from "@/lib/prisma";

export type KnowledgeActionState = { success?: string; error?: string; entityId?: string };

export async function saveKnowledgeArticle(_previousState: KnowledgeActionState, formData: FormData): Promise<KnowledgeActionState> {
  const session = await requirePermission("MANAGE_KNOWLEDGE");
  const parsed = knowledgeFormData(formData);
  if ("error" in parsed) return { error: parsed.error };
  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : "";
  const input = parsed.data;
  try {
    const saved = await prisma.$transaction(async (transaction) => {
      const existing = id ? await transaction.knowledgeArticle.findUnique({ where: { id } }) : null;
      if (id && !existing) throw new Error("NOT_FOUND");
      const duplicate = await transaction.knowledgeArticle.findFirst({ where: { slug: input.slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
      if (duplicate) throw new Error("DUPLICATE_SLUG");
      const status = input.status as "DRAFT" | "PUBLISHED" | "ARCHIVED";
      const { categorySlugs, placeIds, relatedArticleIds, ...articleInput } = input;
      const data = { ...articleInput, status, intent: input.intent as "NEED_HELP" | "HELP_SOMEONE" | "GOOD_PRACTICES" | "VOLUNTEERING" | "ORGANIZATIONS", contentType: input.contentType as "GUIDE" | "HOW_TO" | "EXPLAINER" | "CHECKLIST" | "FAQ" | "GOOD_PRACTICE" | "CASE_STUDY" | "PARTNER_CONTENT" | "ANNOUNCEMENT", publishedAt: status === "PUBLISHED" ? existing?.publishedAt ?? new Date() : null };
      const categories = await transaction.category.findMany({ where: { slug: { in: categorySlugs }, active: true }, select: { id: true } });
      const places = await transaction.place.findMany({ where: { id: { in: placeIds } }, select: { id: true } });
      const article = existing ? await transaction.knowledgeArticle.update({ where: { id }, data }) : await transaction.knowledgeArticle.create({ data });
      await transaction.knowledgeArticleCategory.deleteMany({ where: { articleId: article.id } });
      await transaction.knowledgeArticlePlace.deleteMany({ where: { articleId: article.id } });
      await transaction.knowledgeArticleRelation.deleteMany({ where: { articleId: article.id } });
      if (categories.length) await transaction.knowledgeArticleCategory.createMany({ data: categories.map(({ id: categoryId }) => ({ articleId: article.id, categoryId })) });
      if (places.length) await transaction.knowledgeArticlePlace.createMany({ data: places.map(({ id: placeId }) => ({ articleId: article.id, placeId })) });
      const related = await transaction.knowledgeArticle.findMany({ where: { id: { in: relatedArticleIds }, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
      if (related.length) await transaction.knowledgeArticleRelation.createMany({ data: related.map(({ id: relatedArticleId }) => ({ articleId: article.id, relatedArticleId })) });
      await transaction.auditLog.create({ data: { adminUserId: session.user.id, action: status === "PUBLISHED" ? "KNOWLEDGE_PUBLISHED" : status === "ARCHIVED" ? "KNOWLEDGE_ARCHIVED" : existing ? "KNOWLEDGE_UPDATED" : "KNOWLEDGE_CREATED", entityType: "KNOWLEDGE_ARTICLE", entityId: article.id, changedFields: Object.keys(input), previousValues: existing ? { title: existing.title, status: existing.status } as Prisma.InputJsonValue : Prisma.JsonNull, newValues: { title: article.title, status: article.status } as Prisma.InputJsonValue, changeOrigin: "ADMIN_MANUAL" } });
      return article.id;
    });
    revalidatePath("/encyklopedia"); revalidatePath(`/encyklopedia/${input.slug}`); revalidatePath("/admin/encyklopedia");
    return { success: "Materiał zapisany.", entityId: saved };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "DUPLICATE_SLUG") return { error: "Ten slug jest już używany. Wybierz inny." };
    return { error: "Nie udało się zapisać materiału. Treść pozostała w edytorze. Spróbuj ponownie." };
  }
}

import { notFound } from "next/navigation";
import { KnowledgeForm } from "@/components/admin/knowledge/knowledge-form";
import { requirePermission } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

export default async function EditKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("MANAGE_KNOWLEDGE");
  const id = (await params).id;
  const [article, categories, relatedArticles] = await Promise.all([
    prisma.knowledgeArticle.findUnique({ where: { id }, include: { categories: { include: { category: true } }, places: true, relatedFrom: { select: { relatedArticleId: true } } } }),
    prisma.category.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.knowledgeArticle.findMany({ where: { id: { not: id } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  if (!article) notFound();
  return <div className="space-y-5"><header><p className="mb-1 text-sm font-bold text-brand-strong">Encyklopedia Dobra</p><h1 className="text-3xl font-bold">Edytuj materiał</h1><p className="mt-1 text-sm text-muted-foreground">Zapisuj zmiany bezpośrednio w tym artykule. Istniejące treści Markdown pozostają zachowane.</p></header><KnowledgeForm categories={categories} relatedArticles={relatedArticles} article={{ ...article, categorySlugs: article.categories.map(({ category }) => category.slug), placeIds: article.places.map(({ placeId }) => placeId), relatedArticleIds: article.relatedFrom.map(({ relatedArticleId }) => relatedArticleId) }} /></div>;
}

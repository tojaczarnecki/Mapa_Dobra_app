import { requirePermission } from "@/lib/admin/session";
import { KnowledgeForm } from "@/components/admin/knowledge/knowledge-form";
import { prisma } from "@/lib/prisma";
export default async function NewKnowledgePage() {
  await requirePermission("MANAGE_KNOWLEDGE");
  const [categories, relatedArticles] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.knowledgeArticle.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return <div className="space-y-5"><header><p className="mb-1 text-sm font-bold text-brand-strong">Encyklopedia Dobra</p><h1 className="text-3xl font-bold">Nowy materiał</h1><p className="mt-1 text-sm text-muted-foreground">Twórz treści wizualnie. System zapisuje je w bezpiecznym Markdown.</p></header><KnowledgeForm categories={categories} relatedArticles={relatedArticles} /></div>;
}

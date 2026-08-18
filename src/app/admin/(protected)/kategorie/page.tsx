import { CategoryEditor, NewCategoryForm } from "@/components/admin/categories/category-manager";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/session";

export default async function AdminCategoriesPage() {
  await requirePermission("VIEW_CATEGORIES");
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { placeLinks: true, primaryPlaces: true } },
      placeLinks: {
        where: { place: { publicationStatus: { in: ["PUBLISHED", "TEMPORARILY_CLOSED", "PERMANENTLY_CLOSED"] } } },
        select: { placeId: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-5">
      <header><p className="mb-1 text-sm font-bold text-brand-strong">Słownik pomocy</p><h1 className="text-3xl font-bold">Kategorie</h1><p className="mt-1 text-sm text-muted-foreground">{categories.length} kategorii · istniejące slugi są chronione</p></header>
      <NewCategoryForm />
      <section className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="hidden grid-cols-[minmax(160px,1.2fr)_minmax(130px,.9fr)_90px_100px_100px_90px] gap-2 border-b border-border bg-[#f5f3ed] px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground md:grid">
          <span>Kategoria</span><span>Miejsca</span><span>Kolejność</span><span>Status</span><span>Główna</span><span>Akcja</span>
        </div>
        {categories.map((category) => <CategoryEditor key={category.id} category={{ id: category.id, name: category.name, slug: category.slug, sortOrder: category.sortOrder, active: category.active, placeCount: category._count.placeLinks, publishedCount: category.placeLinks.length, primaryCount: category._count.primaryPlaces }} />)}
      </section>
    </div>
  );
}

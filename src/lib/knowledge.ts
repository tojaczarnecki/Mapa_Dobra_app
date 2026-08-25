import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const knowledgeIntentLabels = {
  NEED_HELP: "Potrzebuję pomocy",
  HELP_SOMEONE: "Chcę komuś pomóc",
  GOOD_PRACTICES: "Dobre praktyki",
  VOLUNTEERING: "Zaangażowanie i wolontariat",
  ORGANIZATIONS: "Dla organizacji i firm",
} as const;

export const knowledgeTypeLabels = {
  GUIDE: "Poradnik",
  HOW_TO: "Jak to zrobić",
  EXPLAINER: "Wyjaśnienie",
  CHECKLIST: "Lista kontrolna",
  FAQ: "FAQ",
  GOOD_PRACTICE: "Dobra praktyka",
  CASE_STUDY: "Studium przypadku",
  PARTNER_CONTENT: "Materiał partnerski",
  ANNOUNCEMENT: "Informacja",
} as const;

export type KnowledgeIntent = keyof typeof knowledgeIntentLabels;

export type KnowledgeCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentType: keyof typeof knowledgeTypeLabels;
  intent: KnowledgeIntent;
  tags: string[];
  readingTime: number | null;
  featured: boolean;
  partnerContent: boolean;
  partnerName: string | null;
  authorDisplayName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  categories: Array<{ slug: string; name: string }>;
};

export type KnowledgeArticle = KnowledgeCard & {
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  emergencyNote: string | null;
  partnerDisclosure: string | null;
  geographicScope: string | null;
  places: Array<{ id: string; name: string; slug: string; categorySlug: string; address: string; phone: string | null }>;
  related: KnowledgeCard[];
};

export function calculateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 210));
}

function canUseDemoKnowledge() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_DATA === "true";
}

const include = {
  categories: { include: { category: true } },
  places: { include: { place: { include: { primaryCategory: true } } } },
  relatedTo: { include: { relatedArticle: { include: { categories: { include: { category: true } } } } } },
} satisfies Prisma.KnowledgeArticleInclude;

const demoArticles: KnowledgeArticle[] = [
  {
    id: "demo-help-food", title: "Gdzie można dostać bezpłatny posiłek?", slug: "gdzie-dostac-bezplatny-posilek",
    excerpt: "Sprawdź, jak szybko znaleźć miejsce z jedzeniem i jakie informacje warto przygotować przed wyjściem.",
    contentType: "GUIDE", intent: "NEED_HELP", tags: ["jedzenie", "pomoc"], readingTime: 3, featured: true,
    partnerContent: false, partnerName: null, authorDisplayName: "Zespół Mapy Dobra", publishedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
    categories: [{ slug: "jedzenie", name: "Jedzenie" }], content: "## Co możesz zrobić teraz?\n\nWyszukaj najbliższe miejsca z jedzeniem i sprawdź ich godziny działania. Jeśli nie wiesz, od czego zacząć, wybierz miejsce otwarte teraz.\n\n### Przydatne informacje\n\n- sprawdź adres i godziny,\n- zadzwoń, jeśli dane wymagają potwierdzenia,\n- wybierz trasę, która jest dla Ciebie możliwa.", seoTitle: null, seoDescription: null, emergencyNote: null, partnerDisclosure: null, geographicScope: "Polska", places: [], related: [],
  },
  {
    id: "demo-help-shelter", title: "Jak znaleźć nocleg na dzisiaj?", slug: "jak-znalezc-nocleg-na-dzisiaj",
    excerpt: "Zobacz, jak porównać dostępność noclegu, warunki przyjęcia i godziny przyjmowania.",
    contentType: "HOW_TO", intent: "NEED_HELP", tags: ["nocleg", "dzisiaj"], readingTime: 4, featured: true,
    partnerContent: false, partnerName: null, authorDisplayName: "Zespół Mapy Dobra", publishedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
    categories: [{ slug: "nocleg", name: "Nocleg" }], content: "## Zacznij od sprawdzenia dostępności\n\nInformacja o wolnych miejscach może się zmieniać. Zadzwoń przed przyjazdem i zapytaj o aktualne warunki przyjęcia.\n\n## Co przygotować\n\nSprawdź wymagania, godziny przyjęć i adres. Jeśli nie masz dokumentów albo skierowania, przeczytaj warunki konkretnego miejsca.", seoTitle: null, seoDescription: null, emergencyNote: null, partnerDisclosure: null, geographicScope: "Polska", places: [], related: [],
  },
  {
    id: "demo-help-someone", title: "Ktoś prosi Cię o pieniądze. Jak możesz pomóc?", slug: "ktos-prosi-o-pieniadze-jak-pomoc",
    excerpt: "Poznaj kilka spokojnych i konkretnych sposobów reagowania z szacunkiem dla drugiej osoby.",
    contentType: "GOOD_PRACTICE", intent: "HELP_SOMEONE", tags: ["pomaganie", "dobre praktyki"], readingTime: 3, featured: true,
    partnerContent: false, partnerName: null, authorDisplayName: "Zespół Mapy Dobra", publishedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"),
    categories: [], content: "## Zacznij od rozmowy\n\nMożesz zapytać, czego druga osoba potrzebuje, i zaproponować konkretną formę wsparcia. Ważne jest, aby nie odbierać jej sprawczości i uszanować odmowę.\n\nJeśli potrzebna jest pomoc rzeczowa lub miejsce z jedzeniem, możesz skorzystać z wyszukiwarki Mapy Dobra.", seoTitle: null, seoDescription: null, emergencyNote: null, partnerDisclosure: null, geographicScope: "Polska", places: [], related: [],
  },
];

function toCard(article: Prisma.KnowledgeArticleGetPayload<{ include: typeof include }>): KnowledgeCard {
  return {
    id: article.id, title: article.title, slug: article.slug, excerpt: article.excerpt, contentType: article.contentType,
    intent: article.intent, tags: article.tags, readingTime: article.readingTime, featured: article.featured,
    partnerContent: article.partnerContent, partnerName: article.partnerName, authorDisplayName: article.authorDisplayName, publishedAt: article.publishedAt,
    updatedAt: article.updatedAt, categories: article.categories.map(({ category }) => ({ slug: category.slug, name: category.name })),
  };
}

function toArticle(article: Prisma.KnowledgeArticleGetPayload<{ include: typeof include }>): KnowledgeArticle {
  const card = toCard(article);
  return {
    ...card, content: article.content, seoTitle: article.seoTitle, seoDescription: article.seoDescription,
    emergencyNote: article.emergencyNote, partnerDisclosure: article.partnerDisclosure, geographicScope: article.geographicScope,
    places: article.places.map(({ place }) => ({ id: place.id, name: place.name, slug: place.slug, categorySlug: place.primaryCategory.slug, address: place.addressLine, phone: place.phone })),
    related: article.relatedTo.map(({ relatedArticle }) => toCard({ ...relatedArticle, places: [], relatedTo: [], categories: relatedArticle.categories } as never)),
  };
}

export async function getPublicKnowledgeArticles(filters: { query?: string; intent?: KnowledgeIntent; category?: string } = {}) {
  try {
    const articles = await prisma.knowledgeArticle.findMany({ where: { status: "PUBLISHED", ...(filters.intent ? { intent: filters.intent } : {}), ...(filters.category ? { categories: { some: { category: { slug: filters.category } } } } : {}) }, include, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }] });
    const normalized = filters.query?.trim().toLocaleLowerCase("pl-PL");
    return articles.map(toCard).filter((article) => !normalized || [article.title, article.excerpt, article.tags.join(" "), article.categories.map((category) => category.name).join(" ")].join(" ").toLocaleLowerCase("pl-PL").includes(normalized));
  } catch {
    if (!canUseDemoKnowledge()) return [];
    const normalized = filters.query?.trim().toLocaleLowerCase("pl-PL");
    return demoArticles.filter((article) => (!filters.intent || article.intent === filters.intent) && (!filters.category || article.categories.some((category) => category.slug === filters.category)) && (!normalized || [article.title, article.excerpt, article.tags.join(" ")].join(" ").toLocaleLowerCase("pl-PL").includes(normalized)));
  }
}

export async function getPublicKnowledgeArticle(slug: string) {
  try {
    const article = await prisma.knowledgeArticle.findFirst({ where: { slug, status: "PUBLISHED" }, include });
    return article ? toArticle(article) : canUseDemoKnowledge() ? demoArticles.find((item) => item.slug === slug) ?? null : null;
  } catch {
    return canUseDemoKnowledge() ? demoArticles.find((item) => item.slug === slug) ?? null : null;
  }
}

export async function getPublicKnowledgeSitemapArticles() {
  try {
    return await prisma.knowledgeArticle.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
  } catch {
    return [];
  }
}

export function getDemoKnowledgeArticles() { return demoArticles; }

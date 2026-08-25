import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { KnowledgeContent } from "@/components/knowledge/knowledge-content";
import { KnowledgeCardView } from "@/components/knowledge/knowledge-card";
import { KnowledgeVisual } from "@/components/knowledge/knowledge-visual";
import { ArticleShare } from "@/components/knowledge/article-share";
import { detailHrefWithSource } from "@/lib/places/detail-return";
import { calculateReadingTime, getPublicKnowledgeArticle, getPublicKnowledgeArticles, knowledgeIntentLabels, knowledgeTypeLabels } from "@/lib/knowledge";
import { getSiteBaseUrl } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const article = await getPublicKnowledgeArticle((await params).slug); return article ? { title: `${article.seoTitle ?? article.title} | Mapa Dobra`, description: article.seoDescription ?? article.excerpt, alternates: { canonical: `/encyklopedia/${article.slug}` } } : { title: "Encyklopedia Dobra | Mapa Dobra" }; }

export default async function KnowledgeArticlePage({ params }: Props) {
  const article = await getPublicKnowledgeArticle((await params).slug);
  if (!article) notFound();
  const baseUrl = getSiteBaseUrl();
  const articleJsonLd = { "@context": "https://schema.org", "@type": article.contentType === "HOW_TO" ? "HowTo" : "Article", headline: article.title, description: article.excerpt, dateModified: article.updatedAt.toISOString(), datePublished: article.publishedAt?.toISOString(), url: baseUrl ? new URL(`/encyklopedia/${article.slug}`, baseUrl).toString() : undefined };
  const readingTime = calculateReadingTime(article.content);
  const firstCategory = article.categories[0];
  const relatedPool = await getPublicKnowledgeArticles();
  const manualRelated = article.related.slice(0, 4);
  const manualIds = new Set(manualRelated.map((item) => item.id));
  const categorySlugs = new Set(article.categories.map((item) => item.slug));
  const tags = new Set(article.tags);
  const fallbackRelated = relatedPool
    .filter((item) => item.slug !== article.slug && !manualIds.has(item.id))
    .map((item) => ({ item, score: (item.intent === article.intent ? 4 : 0) + (item.categories.some((category) => categorySlugs.has(category.slug)) ? 3 : 0) + (item.tags.some((tag) => tags.has(tag)) ? 2 : 0) }))
    .sort((left, right) => right.score - left.score)
    .map(({ item }) => item);
  const relatedArticles = [...manualRelated, ...fallbackRelated].slice(0, 4);
  return (
    <div className="knowledge-article-page">
      <div className="knowledge-article-shell">
        <nav className="knowledge-breadcrumbs" aria-label="Okruszki nawigacji"><Link href="/">Mapa Dobra</Link><span aria-hidden="true">/</span><Link href="/encyklopedia">Encyklopedia Dobra</Link>{firstCategory ? <><span aria-hidden="true">/</span><Link href={`/encyklopedia?kategoria=${firstCategory.slug}`}>{firstCategory.name}</Link></> : null}<span aria-hidden="true">/</span><span>{article.title}</span></nav>
        <div className="knowledge-article-layout"><aside className="knowledge-article-utility" aria-label="Narzędzia artykułu"><span className="knowledge-utility-reading">{readingTime} min czytania</span><ArticleShare title={article.title} text={article.excerpt} /></aside><article className="knowledge-article-main"><p className="knowledge-eyebrow">{knowledgeTypeLabels[article.contentType]} · {knowledgeIntentLabels[article.intent]}</p><h1>{article.title}</h1><p className="knowledge-article-lead">{article.excerpt}</p><div className="knowledge-article-meta"><span>Ostatnia aktualizacja: {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(article.updatedAt)}</span><span>{readingTime} min czytania</span>{article.geographicScope ? <span>{article.geographicScope}</span> : null}</div><div className="knowledge-author-byline"><span>Autor</span><strong>{article.authorDisplayName ?? "Zespół Mapy Dobra"}</strong></div><div className="knowledge-article-mobile-share"><ArticleShare title={article.title} text={article.excerpt} /></div>{article.partnerContent ? <p className="knowledge-partner-label">{article.partnerDisclosure ?? `Materiał partnerski${article.partnerName ? `: ${article.partnerName}` : ""}`}</p> : null}<KnowledgeVisual imageSrc={"heroImage" in article && typeof article.heroImage === "string" ? article.heroImage : null} imageAlt={"heroImage" in article && typeof article.heroImage === "string" ? article.title : ""} className="knowledge-article-visual" />{article.emergencyNote ? <aside className="knowledge-emergency">{article.emergencyNote}</aside> : null}<KnowledgeContent content={article.content} />
          <section className="knowledge-action-block"><h2>Co możesz zrobić teraz?</h2><p className="knowledge-action-helper">Jeśli chcesz działać od razu, możesz znaleźć miejsce albo sprawdzić pomoc na mapie.</p><div className="knowledge-action-links"><Link href={article.intent === "HELP_SOMEONE" ? "/uruchom-pomoc" : "/szukaj"}>{article.intent === "HELP_SOMEONE" ? "Uruchom pomoc" : "Znajdź miejsce"}<ArrowRight aria-hidden="true" size={17} /></Link><Link href="/mapa">Pokaż pomoc na mapie<ArrowRight aria-hidden="true" size={17} /></Link></div></section>
          {article.places.length ? <section className="knowledge-related-places"><h2>Gdzie możesz uzyskać pomoc?</h2>{article.places.map((place) => <article key={place.id}><div><h3><Link href={detailHrefWithSource(`/lodz/${place.categorySlug}/${place.slug}`, "szukaj")}>{place.name}</Link></h3><p><MapPin aria-hidden="true" size={16} />{place.address}</p></div>{place.phone ? <a href={`tel:${place.phone}`} aria-label={`Zadzwoń do ${place.name}`}><Phone aria-hidden="true" size={17} /></a> : null}</article>)}</section> : null}
          {relatedArticles.length ? <section className="knowledge-related"><h2>Przeczytaj również</h2><div className="knowledge-related-grid">{relatedArticles.map((item) => <KnowledgeCardView key={item.id} article={item} />)}</div></section> : null}
        </article></div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    </div>
  );
}

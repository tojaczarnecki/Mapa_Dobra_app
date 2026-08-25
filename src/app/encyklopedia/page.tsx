import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { KnowledgeCardView } from "@/components/knowledge/knowledge-card";
import { getPublicKnowledgeArticles, knowledgeIntentLabels, type KnowledgeIntent } from "@/lib/knowledge";

export const metadata: Metadata = { title: "Encyklopedia Dobra | Mapa Dobra", description: "Praktyczne wskazówki, jak uzyskać pomoc i jak mądrze pomagać." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function EncyclopediaPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = first(params.q).slice(0, 120);
  const intent = first(params.intencja) as KnowledgeIntent;
  const category = first(params.kategoria);
  const articles = await getPublicKnowledgeArticles({ query, intent: intent in knowledgeIntentLabels ? intent : undefined, category: category || undefined });
  const hero = articles.find((article) => article.featured) ?? articles[0];
  const secondary = articles.filter((article) => article.id !== hero?.id).slice(0, 4);
  const latest = articles.filter((article) => article.id !== hero?.id && !secondary.some((item) => item.id === article.id));

  return (
    <div className="knowledge-page">
      <div className="knowledge-shell">
        <nav className="knowledge-breadcrumbs" aria-label="Okruszki nawigacji"><Link href="/">Mapa Dobra</Link><span aria-hidden="true">/</span><span>Encyklopedia Dobra</span></nav>
        <header className="knowledge-header"><p className="knowledge-eyebrow">WIEDZA, KTÓRA PROWADZI DO DZIAŁANIA</p><h1>Encyklopedia Dobra</h1><p>Praktyczne wskazówki, jak uzyskać pomoc i jak mądrze pomagać.</p></header>
        <form className="knowledge-search" role="search">
          <label htmlFor="knowledge-query">Czego chcesz się dowiedzieć?</label>
          <div><Search aria-hidden="true" size={19} /><input id="knowledge-query" name="q" defaultValue={query} placeholder="Np. jak znaleźć nocleg na dzisiaj?" /><button type="submit">Szukaj wiedzy</button></div>
        </form>
        {hero ? <section className="knowledge-featured-section" aria-labelledby="knowledge-featured-title"><div className="knowledge-section-heading"><div><p className="knowledge-eyebrow">NAJWAŻNIEJSZE NA START</p><h2 id="knowledge-featured-title">Wybierz temat na dziś</h2></div></div><KnowledgeCardView article={hero} variant="featured" /></section> : null}
        {secondary.length ? <section className="knowledge-important-section" aria-labelledby="knowledge-important-title"><div className="knowledge-section-heading"><div><p className="knowledge-eyebrow">NAJWAŻNIEJSZE TERAZ</p><h2 id="knowledge-important-title">Krótko i konkretnie</h2></div></div><ol className="knowledge-important-list">{secondary.map((article) => <li key={article.id}><span aria-hidden="true">{String(secondary.indexOf(article) + 1).padStart(2, "0")}</span><div><p>{article.categories[0]?.name ?? knowledgeIntentLabels[article.intent]}</p><Link href={`/encyklopedia/${article.slug}`}>{article.title}</Link></div><ArrowRight aria-hidden="true" size={18} /></li>)}</ol></section> : null}
        <section className="knowledge-intent-section" aria-labelledby="knowledge-intent-title"><div className="knowledge-section-heading"><div><p className="knowledge-eyebrow">ZNAJDŹ SWÓJ PUNKT WIDZENIA</p><h2 id="knowledge-intent-title">O czym chcesz przeczytać?</h2></div></div><nav className="knowledge-intents" aria-label="Intencje treści">{Object.entries(knowledgeIntentLabels).map(([value, label]) => <Link key={value} className={intent === value ? "active" : ""} href={`/encyklopedia?intencja=${value}`}>{label}<ArrowRight aria-hidden="true" size={17} /></Link>)}</nav></section>
        {latest.length || !hero ? <section className="knowledge-section knowledge-latest-section"><div className="knowledge-section-heading"><div><p className="knowledge-eyebrow">NAJNOWSZE</p><h2>{query || intent || category ? "Wyniki wyszukiwania" : "Jeszcze trochę dobra"}</h2></div><span>{articles.length} {articles.length === 1 ? "materiał" : "materiałów"}</span></div>{latest.length ? <div className="knowledge-grid">{latest.map((article) => <KnowledgeCardView article={article} key={article.id} />)}</div> : <div className="knowledge-empty"><h3>Nie znaleźliśmy takiej informacji.</h3><p>Spróbuj krótszego hasła albo przejdź do wyszukiwarki miejsc pomocy.</p><Link href="/szukaj">Znajdź miejsce pomocy</Link></div>}</section> : null}
      </div>
    </div>
  );
}

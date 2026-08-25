import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { knowledgeIntentLabels, knowledgeTypeLabels, type KnowledgeCard } from "@/lib/knowledge";
import { KnowledgeVisual } from "./knowledge-visual";

export function KnowledgeCardView({ article, variant = "default" }: { article: KnowledgeCard; variant?: "default" | "featured" | "compact" }) {
  const imageSrc = "heroImage" in article && typeof article.heroImage === "string" ? article.heroImage : null;
  const content = (
    <>
      <div className="knowledge-card-meta">
        <span>{knowledgeTypeLabels[article.contentType]}</span>
        <span>{knowledgeIntentLabels[article.intent]}</span>
      </div>
      <h2>{variant === "compact" ? <Link className="knowledge-card-compact-link" href={`/encyklopedia/${article.slug}`}><span>{article.title}</span><ArrowRight aria-hidden="true" size={18} /></Link> : <Link href={`/encyklopedia/${article.slug}`}>{article.title}</Link>}</h2>
      {variant !== "compact" ? <p>{article.excerpt}</p> : null}
      {variant !== "compact" ? <Link className="knowledge-card-link" href={`/encyklopedia/${article.slug}`}>
        Czytaj <ArrowRight aria-hidden="true" size={17} />
      </Link> : null}
    </>
  );

  return (
    <article className={`knowledge-card knowledge-card-${variant}`}>
      {variant !== "compact" ? <KnowledgeVisual imageSrc={imageSrc} imageAlt={imageSrc ? article.title : ""} className="knowledge-card-visual" /> : null}
      {variant === "featured" ? <div className="knowledge-card-featured-content">{content}</div> : content}
    </article>
  );
}

import { HelpGuideCard } from "@/components/help-guides/help-guide-card";
import { PublicActionLink } from "@/components/places/public-action-link";
import { getPublicHelpGuides } from "@/data/help-guides";

export function HomeGuideModule() {
  const guides = getPublicHelpGuides().slice(0, 3);

  return (
    <section className="home-guides-section" aria-labelledby="home-guides-title">
      <header className="home-guides-header">
        <div>
          <p className="home-guides-eyebrow">PORADNIKI</p>
          <h2 id="home-guides-title">Jak pomagać mądrze?</h2>
        </div>
        <p>Proste wskazówki, jak reagować i wspierać z szacunkiem.</p>
      </header>
      <div className="home-guides-grid">
        {guides.map((guide, index) => (
          <HelpGuideCard key={guide.slug} guide={guide} layout={index === 2 ? "wide" : "standard"} variant="guide" />
        ))}
      </div>
      <div className="home-guides-footer">
        <PublicActionLink href="/jak-pomagac" variant="primary" journey="guide" system chevron>Zobacz wszystkie poradniki</PublicActionLink>
      </div>
    </section>
  );
}

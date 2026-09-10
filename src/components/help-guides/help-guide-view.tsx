import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getPublicHelpGuides, type HelpGuide } from "@/data/help-guides";
import { GuideArticleHero, GuideAvoidList, GuideEditorialBreak, GuideEmergency, GuideNextStep, GuideOpening, GuideStepList } from "@/components/help-guides/editorial-guide-sections";

const guideQuotes: Record<string, string> = {
  "pieniadze-czy-konkretna-pomoc": "Pomoc zaczyna się od pytania, nie od założenia.",
  "jak-zaczac-rozmowe": "Odmowa też jest odpowiedzią. Uszanowanie jej jest częścią pomocy.",
  "czego-unikac-pomagajac": "Pomaganie nie daje prawa do przejmowania kontroli.",
  "jak-wskazac-miejsce-pomocy": "Dobra wskazówka prowadzi do konkretnego miejsca i zostawia przestrzeń na decyzję.",
};

export function HelpGuideView({ guide }: { guide: HelpGuide }) {
  const relatedGuides = getPublicHelpGuides().filter((item) => item.slug !== guide.slug).slice(0, 3);
  const toc = [
    { id: "guide-opening", label: "Najważniejsze na początek" },
    { id: "guide-steps", label: "Co możesz zrobić" },
    { id: "guide-avoid", label: "Czego lepiej unikać" },
    ...(guide.emergency ? [{ id: "guide-emergency", label: guide.emergency.title }] : []),
  ];
  return (
    <article className="journey-guide guide-article-page mobile-nav-safe-content">
      <div className="guide-article-wrap">
        <Link href="/jak-pomagac" className="guide-article-back">
          <ArrowLeft aria-hidden="true" size={17} /> Wróć do poradników
        </Link>
        <GuideArticleHero guide={guide} />
        <div className="guide-article-layout">
          {toc.length >= 3 ? <aside className="guide-article-toc" aria-label="Spis treści"><p>W tym poradniku</p><nav><ol>{toc.map((item) => <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>)}</ol></nav></aside> : null}
          <div className="guide-article-body"><GuideOpening guide={guide} /><GuideStepList steps={guide.steps} /><GuideEditorialBreak text={guideQuotes[guide.slug] ?? guide.intro} /><GuideAvoidList items={guide.avoid} />{guide.emergency ? <GuideEmergency emergency={guide.emergency} /> : null}<GuideNextStep guide={guide} /></div>
        </div>
        {relatedGuides.length ? <section className="guide-related" aria-labelledby="guide-related-title"><p className="guide-article-eyebrow">MOŻE PRZYDAĆ CI SIĘ TEŻ</p><h2 id="guide-related-title">Jeszcze jedna wskazówka</h2><div>{relatedGuides.map((item) => <Link key={item.slug} href={`/jak-pomagac/${item.slug}`}><span>{item.shortTitle ?? item.title}</span><ArrowRight aria-hidden="true" size={16} /></Link>)}</div></section> : null}
      </div>
    </article>
  );
}

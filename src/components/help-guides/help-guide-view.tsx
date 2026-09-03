import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { HelpGuide } from "@/data/help-guides";
import { GuideArticleHero, GuideAvoidList, GuideEditorialBreak, GuideEmergency, GuideNextStep, GuideOpening, GuideStepList } from "@/components/help-guides/editorial-guide-sections";

const guideQuotes: Record<string, string> = {
  "pieniadze-czy-konkretna-pomoc": "Pomoc zaczyna się od pytania, nie od założenia.",
  "jak-zaczac-rozmowe": "Odmowa też jest odpowiedzią. Uszanowanie jej jest częścią pomocy.",
  "czego-unikac-pomagajac": "Pomaganie nie daje prawa do przejmowania kontroli.",
  "jak-wskazac-miejsce-pomocy": "Dobra wskazówka prowadzi do konkretnego miejsca i zostawia przestrzeń na decyzję.",
};

export function HelpGuideView({ guide }: { guide: HelpGuide }) {
  return (
    <article className="journey-guide guide-article-page mobile-nav-safe-content">
      <div className="guide-article-wrap">
      <Link href="/jak-pomagac" className="guide-article-back">
        <ArrowLeft aria-hidden="true" size={17} /> Wróć do poradników
      </Link>
      <GuideArticleHero guide={guide} />
      <GuideOpening guide={guide} />
      <GuideStepList steps={guide.steps} />
      <GuideEditorialBreak text={guideQuotes[guide.slug] ?? guide.intro} />
      <GuideAvoidList items={guide.avoid} />
      {guide.emergency ? <GuideEmergency emergency={guide.emergency} /> : null}
      <GuideNextStep guide={guide} />
      </div>
    </article>
  );
}

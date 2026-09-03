import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import type { HelpGuide } from "@/data/help-guides";

const guideIllustrations: Record<string, { src: string; alt: string }> = {
  "jak-zaczac-rozmowe": { src: "/brand/help-guides/guide-conversation.png", alt: "Dwie osoby rozmawiają spokojnie" },
  "pieniadze-czy-konkretna-pomoc": { src: "/brand/help-scenarios/help-money.png", alt: "Dwie osoby rozmawiają o możliwej pomocy" },
  "jak-wskazac-miejsce-pomocy": { src: "/brand/help-scenarios/help-general.png", alt: "Dwie osoby korzystają z mapy, szukając miejsca pomocy" },
  "czego-unikac-pomagajac": { src: "/brand/help-guides/guide-boundaries.png", alt: "Dwie osoby zachowują swoje granice" },
};

export function GuideArticleHero({ guide }: { guide: HelpGuide }) {
  const illustration = guideIllustrations[guide.slug];
  return (
    <header className="guide-article-hero">
      <div className="guide-article-hero-copy">
        <p className="guide-article-eyebrow">JAK POMAGAĆ</p>
        <h1>{guide.title}</h1>
        <p className="guide-article-lead">{guide.intro}</p>
      </div>
      {illustration ? <div className="guide-article-hero-art"><Image src={illustration.src} alt={illustration.alt} width={640} height={480} priority sizes="(max-width: 767px) 82vw, 420px" /></div> : null}
    </header>
  );
}

export function GuideOpening({ guide }: { guide: HelpGuide }) {
  const text = guide.situation ?? guide.intro;
  return <section className="guide-opening" aria-labelledby="guide-opening-title"><p className="guide-article-eyebrow">ZACZNIJ TUTAJ</p><h2 id="guide-opening-title">Najważniejsze na początek</h2><p>{text}</p></section>;
}

export function GuideStepList({ steps }: { steps: string[] }) {
  return <section className="guide-steps-section" aria-labelledby="guide-steps-title"><div className="guide-section-heading"><p className="guide-article-eyebrow">KROK PO KROKU</p><h2 id="guide-steps-title">Co możesz zrobić</h2></div><ol className="guide-step-list">{steps.map((step, index) => <li key={step}><span className="guide-step-number">{String(index + 1).padStart(2, "0")}</span><h3>{step}</h3></li>)}</ol></section>;
}

export function GuideEditorialBreak({ text }: { text: string }) {
  return <aside className="guide-editorial-break"><span aria-hidden="true">“</span><p>{text}</p></aside>;
}

export function GuideAvoidList({ items }: { items: string[] }) {
  return <section className="guide-avoid-section" aria-labelledby="guide-avoid-title"><p className="guide-article-eyebrow">WARTO PAMIĘTAĆ</p><h2 id="guide-avoid-title">Czego lepiej unikać</h2><ul>{items.map((item) => <li key={item}><X aria-hidden="true" size={18} /><span>{item}</span></li>)}</ul></section>;
}

export function GuideEmergency({ emergency }: { emergency: NonNullable<HelpGuide["emergency"]> }) {
  return <aside className="guide-emergency" aria-labelledby="guide-emergency-title"><AlertTriangle aria-hidden="true" size={20} /><div><p className="guide-article-eyebrow">WAŻNE</p><h2 id="guide-emergency-title">{emergency.title}</h2><p>{emergency.body}</p><a href="tel:112">Zadzwoń 112 <ArrowRight aria-hidden="true" size={17} /></a></div></aside>;
}

export function GuideNextStep({ guide }: { guide: HelpGuide }) {
  return <section className="guide-next-step" aria-labelledby="guide-next-title"><p className="guide-article-eyebrow">CO MOŻESZ ZROBIĆ TERAZ?</p><h2 id="guide-next-title">Wybierz następny krok.</h2><p>Nie musisz robić wszystkiego naraz. Wybierz działanie, które pasuje do tej sytuacji.</p><Link href={guide.nextAction.href}>{guide.nextAction.label}<ArrowRight aria-hidden="true" size={18} /></Link></section>;
}

export function GuideIllustration({ guide }: { guide: HelpGuide }) {
  const illustration = guideIllustrations[guide.slug];
  if (!illustration) return null;
  return <Image src={illustration.src} alt={illustration.alt} width={640} height={480} sizes="(max-width: 767px) 82vw, 420px" />;
}

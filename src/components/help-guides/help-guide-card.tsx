import type { HelpGuide } from "@/data/help-guides";
import { EditorialCard, type EditorialVariant } from "@/components/ui/editorial-card";

const guideIllustrations: Record<string, { src: string; alt: string }> = {
  "jak-zaczac-rozmowe": { src: "/brand/help-guides/guide-conversation.png", alt: "Dwie osoby rozmawiają spokojnie" },
  "pieniadze-czy-konkretna-pomoc": { src: "/brand/help-scenarios/help-money.png", alt: "Dwie osoby rozmawiają o możliwej pomocy" },
  "jak-wskazac-miejsce-pomocy": { src: "/brand/help-scenarios/help-general.png", alt: "Dwie osoby korzystają z mapy, szukając miejsca pomocy" },
  "czego-unikac-pomagajac": { src: "/brand/help-guides/guide-boundaries.png", alt: "Dwie osoby zachowują swoje granice" },
};
const guideEyebrows: Record<string, string> = {
  "jak-zaczac-rozmowe": "ROZMOWA",
  "pieniadze-czy-konkretna-pomoc": "KONKRETNA POMOC",
  "jak-wskazac-miejsce-pomocy": "DROGA DO POMOCY",
  "czego-unikac-pomagajac": "GRANICE",
};
const guidePreviewDescriptions: Record<string, string> = {
  "pieniadze-czy-konkretna-pomoc": "Możesz zapytać, czego osoba potrzebuje, i zaproponować konkretną pomoc.",
  "jak-wskazac-miejsce-pomocy": "Sprawdź dostępność, godziny, warunki i prosty sposób dotarcia.",
};

export function HelpGuideCard({ guide, variant = "guide", layout = "standard" }: { guide: HelpGuide; variant?: EditorialVariant; layout?: "feature" | "standard" | "wide" }) {
  return <EditorialCard variant={variant} layout={layout} eyebrow={guideEyebrows[guide.slug]} illustration={guideIllustrations[guide.slug]} title={guide.shortTitle ?? guide.title} description={guidePreviewDescriptions[guide.slug] ?? guide.intro} href={`/jak-pomagac/${guide.slug}`} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpGuideView } from "@/components/help-guides/help-guide-view";
import { getHelpGuide, getPublicHelpGuide, getPublicHelpGuides } from "@/data/help-guides";
import { canonicalAlternates } from "@/lib/site-url";

export function generateStaticParams() {
  return getPublicHelpGuides().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getHelpGuide(slug);
  if (!guide) return { title: "Nie znaleziono poradnika | Dobra Mapa", robots: { index: false, follow: false } };
  return {
    title: `${guide.title} | Jak pomagać | Dobra Mapa`,
    description: guide.intro,
    alternates: canonicalAlternates(`/jak-pomagac/${guide.slug}`),
    robots: guide.reviewStatus === "PUBLISHED" ? undefined : { index: false, follow: false },
  };
}

export default async function HelpGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getPublicHelpGuide(slug);
  if (!guide) notFound();
  return <HelpGuideView guide={guide} />;
}

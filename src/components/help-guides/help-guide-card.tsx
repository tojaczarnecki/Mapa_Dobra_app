import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HelpGuide } from "@/data/help-guides";

export function HelpGuideCard({ guide }: { guide: HelpGuide }) {
  return (
    <Link href={`/jak-pomagac/${guide.slug}`} className="group flex min-h-36 flex-col justify-between rounded-xl border border-border bg-surface p-5 transition hover:border-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <span>
        <span className="block text-lg font-extrabold leading-6">{guide.shortTitle ?? guide.title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{guide.intro}</span>
      </span>
      <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong">Przeczytaj wskazówki <ArrowRight aria-hidden="true" size={17} className="transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

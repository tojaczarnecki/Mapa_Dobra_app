import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import type { HelpGuide } from "@/data/help-guides";

export function HelpGuideView({ guide }: { guide: HelpGuide }) {
  return (
    <article className="mx-auto w-full max-w-[760px] px-4 pb-28 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Link href="/jak-pomagac" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-strong hover:underline">
        <ArrowLeft aria-hidden="true" size={17} /> Wróć do poradników
      </Link>
      <header className="mt-8 border-b border-border pb-7">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">Jak pomagać</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{guide.intro}</p>
      </header>

      {guide.situation ? <section className="border-b border-border py-7" aria-labelledby="guide-situation-title"><h2 id="guide-situation-title" className="text-xl font-extrabold">Sytuacja</h2><p className="mt-3 leading-7">{guide.situation}</p></section> : null}
      <section className="border-b border-border py-7" aria-labelledby="guide-steps-title">
        <h2 id="guide-steps-title" className="text-xl font-extrabold">Co możesz zrobić</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </section>
      <section className="border-b border-border py-7" aria-labelledby="guide-avoid-title">
        <h2 id="guide-avoid-title" className="text-xl font-extrabold">Czego lepiej unikać</h2>
        <ul className="mt-4 list-disc space-y-3 pl-6 leading-7">{guide.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      {guide.emergency ? <aside className="border-b border-border py-7" aria-labelledby="guide-emergency-title"><div className="flex gap-3 rounded-lg border border-[#e9521a]/35 bg-[#fff8f3] p-4"><AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-[#b42318]" size={20} /><div><h2 id="guide-emergency-title" className="font-extrabold">{guide.emergency.title}</h2><p className="mt-2 leading-7">{guide.emergency.body}</p><a href="tel:112" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-[#b42318] px-4 py-2 font-bold text-white hover:bg-[#8f1d14]">Zadzwoń 112</a></div></div></aside> : null}
      <section className="pt-7" aria-labelledby="guide-next-title">
        <h2 id="guide-next-title" className="text-xl font-extrabold">Następny krok</h2>
        <Link href={guide.nextAction.href} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold text-foreground hover:bg-brand-strong hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          {guide.nextAction.label} <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </section>
    </article>
  );
}

import type { Metadata } from "next";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import { HelpRequestWizard } from "@/components/help-requests/help-request-wizard";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Uruchom pomoc | Mapa Dobra",
  description: "Przekaż informację o sytuacji, która budzi Twój niepokój.",
  alternates: canonicalAlternates("/uruchom-pomoc"),
};

export default function StartHelpPage() {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1cf] text-[#9a6815]"><HeartHandshake aria-hidden="true" size={30} /></span>
        <p className="mt-5 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Uruchom pomoc</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">Martwisz się o kogoś?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Jeśli widzisz osobę, która może potrzebować wsparcia, możesz przekazać informacje o sytuacji. Pomoże to sprawdzić, jaka forma pomocy może być dostępna.</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Nie oceniamy. Nie etykietujemy. Pomagamy uruchomić wsparcie.</strong> Nie musisz wiedzieć, jakiej dokładnie pomocy potrzeba. Opisz po prostu sytuację, która budzi Twój niepokój.</p>
      </header>
      <div className="mx-auto mt-8 max-w-3xl"><div className="mb-4 flex items-start gap-3 rounded-lg border border-[#d7a548]/55 bg-[#fffaf0] p-4 text-sm leading-6"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={20} /><p>To zgłoszenie jest prywatne. Nie potrzebujemy imienia ani danych osoby, której dotyczy sytuacja.</p></div><HelpRequestWizard /></div>
    </div>
  );
}

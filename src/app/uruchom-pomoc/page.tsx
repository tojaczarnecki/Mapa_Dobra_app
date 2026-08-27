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
    <div className="mx-auto w-full max-w-[920px] px-4 pb-28 pt-4 sm:px-6 sm:pt-8 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1cf] text-[#9a6815]"><HeartHandshake aria-hidden="true" size={26} /></span>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Uruchom pomoc</p>
        <h1 className="mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">Martwisz się o kogoś?</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Opisz po prostu sytuację, którą widzisz. Nie musisz wiedzieć, jakiej dokładnie pomocy potrzeba.
        </p>
      </header>
      <div className="mx-auto mt-5 max-w-3xl">
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#d7a548]/55 bg-[#fffaf0] p-3.5 text-sm leading-6">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={20} />
          <p><strong>Nie oceniamy i nie etykietujemy.</strong> Zgłoszenie jest prywatne; nie potrzebujemy imienia ani danych osoby.</p>
        </div>
        <HelpRequestWizard />
      </div>
    </div>
  );
}

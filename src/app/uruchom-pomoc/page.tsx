import type { Metadata } from "next";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import { HelpRequestWizard } from "@/components/help-requests/help-request-wizard";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Uruchom pomoc | Dobra Mapa",
  description: "Przekaż informację o sytuacji, która budzi Twój niepokój.",
  alternates: canonicalAlternates("/uruchom-pomoc"),
};

function StartHelpContent({ guided = true }: { guided?: boolean }) {
  return (
    <div className={`${guided ? "guided-flow-page " : ""}md-help-request-page mx-auto w-full max-w-[920px] px-4 pb-28 pt-4 sm:px-6 sm:pt-8 lg:px-8`}>
      <header className="mx-auto max-w-3xl text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1cf] text-[#9a6815]"><HeartHandshake aria-hidden="true" size={26} /></span>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[#9a6815]">Przekaż informację</p>
        <h1 className="mt-1.5 text-3xl font-bold leading-tight sm:text-4xl">Przekaż informację o sytuacji</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Przekaż lokalizację i krótko opisz sytuację. Nie musisz znać dokładnej potrzeby ani danych tej osoby.
        </p>
      </header>
      <div className="mx-auto mt-5 max-w-3xl">
        <div className="md-help-trust-note mb-4 flex items-start gap-3 rounded-lg border border-[#d7a548]/55 bg-[#fffaf0] p-3.5 text-sm leading-6">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[#b7791f]" size={20} />
          <p><strong>Nie oceniamy i nie etykietujemy.</strong> Informację możesz przekazać anonimowo.</p>
        </div>
        <HelpRequestWizard />
      </div>
    </div>
  );
}

export default function StartHelpPage() {
  return <StartHelpContent />;
}

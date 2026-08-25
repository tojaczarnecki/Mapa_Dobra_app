import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { HelpRequestWizard } from "@/components/help-requests/help-request-wizard";
import { PUBLIC_GEOGRAPHIC_CONTEXT } from "@/lib/geocoding/geographic-context";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Uruchom pomoc | Mapa Dobra",
  description: "Przekaż informację o sytuacji, która budzi Twój niepokój.",
  alternates: canonicalAlternates("/uruchom-pomoc"),
};

export default function StartHelpPage() {
  return (
    <div className="help-launch-page mx-auto w-full max-w-[1120px] px-4 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="help-launch-column">
        <Link href="/" className="help-launch-back"><ArrowLeft aria-hidden="true" size={17} />Wróć</Link>
        <header className="help-launch-header">
          <p className="help-launch-kicker">Uruchom pomoc</p>
          <h1>Martwisz się o kogoś?</h1>
          <p className="help-launch-intro">Jeśli widzisz osobę, która może potrzebować wsparcia, przekaż krótko informacje o sytuacji.</p>
          <p className="help-launch-claim"><strong>Nie oceniamy. Nie etykietujemy. Pomagamy uruchomić wsparcie.</strong> Nie musisz wiedzieć, jakiej dokładnie pomocy potrzeba.</p>
        </header>
        <div className="help-launch-workspace"><div className="help-launch-privacy"><ShieldCheck aria-hidden="true" size={19} /><p>To zgłoszenie jest prywatne. Nie potrzebujemy imienia ani danych osoby, której dotyczy sytuacja.</p></div><HelpRequestWizard geographicContext={PUBLIC_GEOGRAPHIC_CONTEXT} /></div>
      </div>
    </div>
  );
}

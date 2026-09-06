import type { Metadata } from "next";
import { HelpRequestWizard } from "@/components/help-requests/help-request-wizard";
import { canonicalAlternates } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Uruchom pomoc | Dobra Mapa",
  description: "Przekaż informację o sytuacji, która budzi Twój niepokój.",
  alternates: canonicalAlternates("/uruchom-pomoc"),
};

function StartHelpContent({ guided = true }: { guided?: boolean }) {
  return <div className={guided ? "guided-flow-page help-request-flow-page" : undefined}><HelpRequestWizard /></div>;
}

export default function StartHelpPage() {
  return <StartHelpContent />;
}

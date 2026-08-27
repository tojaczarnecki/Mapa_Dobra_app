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
    <div className="mx-auto w-full max-w-[680px] px-4 pb-28 pt-4 sm:px-6 sm:pt-7">
      <header className="border-b border-[var(--md-line)] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--md-yellow-soft)] text-[var(--md-navy)]">
            <HeartHandshake aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[var(--md-muted)]">Uruchom pomoc</p>
            <h1 className="text-[1.35rem] font-extrabold leading-tight tracking-[-0.025em] text-[var(--md-text)] sm:text-2xl">Martwisz się o kogoś?</h1>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--md-muted)]">
          Przekaż to, co widzisz. Nie musisz wiedzieć, jakiej dokładnie pomocy potrzeba — zgłoszenie może być anonimowe.
        </p>
      </header>

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--md-line)] bg-[var(--md-surface-soft)] p-3 text-xs font-semibold leading-5 text-[var(--md-muted)]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--md-navy)]" size={18} />
        <p><strong className="text-[var(--md-text)]">Prywatne zgłoszenie.</strong> Nie potrzebujemy imienia ani danych osoby, której dotyczy sytuacja.</p>
      </div>

      <div className="md-help-flow mt-4">
        <HelpRequestWizard />
      </div>
    </div>
  );
}

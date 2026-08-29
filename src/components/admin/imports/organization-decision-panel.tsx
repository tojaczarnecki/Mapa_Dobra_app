"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveOrganizationDecision, type OrganizationDecisionActionState } from "@/app/admin/(protected)/importy/actions";

type OrganizationOption = { id: string; name: string; nip: string | null; regon: string | null; krs: string | null; active: boolean };
type CurrentDecision = { decision: "SELECTED_ORGANIZATION" | "NO_ORGANIZATION"; organizationId: string | null } | null;

const initialState: OrganizationDecisionActionState = { ok: false, message: "" };

function optionLabel(organization: OrganizationOption) {
  const identifier = organization.nip || organization.regon || organization.krs;
  return identifier ? `${organization.name} · ${identifier}` : organization.name;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60"><Save aria-hidden="true" size={17} />{pending ? "Zapisywanie…" : "Zapisz decyzję"}</button>;
}

export function OrganizationDecisionPanel({ candidateId, batchId, source, suggestedIds, organizations, currentDecision, active = true }: {
  candidateId: string;
  batchId: string;
  source: { name: string | null; nip: string | null; regon: string | null; krs: string | null };
  suggestedIds: string[];
  organizations: OrganizationOption[];
  currentDecision: CurrentDecision;
  active?: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState<OrganizationDecisionActionState, FormData>(async (_previous, formData) => saveOrganizationDecision(formData), initialState);
  const initialSelection = currentDecision?.decision === "SELECTED_ORGANIZATION" ? currentDecision.organizationId ?? "" : "";
  const [decision, setDecision] = useState<"SELECTED_ORGANIZATION" | "NO_ORGANIZATION">(currentDecision?.decision ?? "SELECTED_ORGANIZATION");
  const [organizationId, setOrganizationId] = useState(initialSelection);
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state]);

  const orderedOrganizations = useMemo(() => {
    const suggested = new Set(suggestedIds);
    return [...organizations].sort((left, right) => Number(suggested.has(right.id)) - Number(suggested.has(left.id)) || left.name.localeCompare(right.name, "pl"));
  }, [organizations, suggestedIds]);
  const selectedOrganization = organizations.find((item) => item.id === initialSelection);

  return <section className="mt-3 rounded-md border border-border bg-[#faf9f5] p-3" aria-labelledby={`organization-decision-${candidateId}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 id={`organization-decision-${candidateId}`} className="font-bold">Organizacja</h3><p className="mt-1 text-xs text-muted-foreground">Dane z arkusza</p></div>
      {currentDecision?.decision === "NO_ORGANIZATION" ? <span className="rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Ustawiono: Bez organizacji</span> : currentDecision?.decision === "SELECTED_ORGANIZATION" ? <span className="rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Wybrano: {selectedOrganization?.name ?? "organizację"}</span> : null}
    </div>
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="font-bold">Nazwa</dt><dd>{source.name || "—"}</dd></div>
      <div><dt className="font-bold">NIP</dt><dd>{source.nip || "—"}</dd></div>
      <div><dt className="font-bold">REGON</dt><dd>{source.regon || "—"}</dd></div>
      <div><dt className="font-bold">KRS</dt><dd>{source.krs || "—"}</dd></div>
    </dl>
    {active ? <form action={action} className="mt-4 space-y-3 border-t border-border pt-3">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="batchId" value={batchId} />
      <fieldset className="space-y-2"><legend className="text-sm font-bold">Decyzja</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="radio" name="decision" value="SELECTED_ORGANIZATION" checked={decision === "SELECTED_ORGANIZATION"} onChange={() => setDecision("SELECTED_ORGANIZATION")} /> Użyj wybranej organizacji</label>
        <select name="organizationId" value={decision === "SELECTED_ORGANIZATION" ? organizationId : ""} onChange={(event) => setOrganizationId(event.target.value)} disabled={decision !== "SELECTED_ORGANIZATION"} required={decision === "SELECTED_ORGANIZATION"} className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"><option value="">Wybierz aktywną organizację</option>{orderedOrganizations.filter((item) => item.active).map((organization) => <option key={organization.id} value={organization.id}>{optionLabel(organization)}{suggestedIds.includes(organization.id) ? " · sugestia" : ""}</option>)}</select>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="radio" name="decision" value="NO_ORGANIZATION" checked={decision === "NO_ORGANIZATION"} onChange={() => setDecision("NO_ORGANIZATION")} /> Bez organizacji</label>
        {source.name ? <p className="text-xs text-muted-foreground">Utwórz miejsce bez przypisywania organizacji.</p> : null}
      </fieldset>
      {state.message ? <p role={state.ok ? undefined : "alert"} className={`text-sm font-semibold ${state.ok ? "text-brand-strong" : "text-[#8c2d0c]"}`}>{state.message}</p> : null}
      <SaveButton />
    </form> : <p className="mt-3 text-sm text-muted-foreground">{currentDecision ? "Decyzja organizacyjna nie jest już aktywna dla tego rekordu." : "Dopasowano aktywną organizację. Nie wymaga dodatkowej decyzji."}</p>}
  </section>;
}

"use client";

import type { FormDraft } from "@/lib/form-drafts";

export function FormDraftResume<T>({ draft, label, onResume, onDiscard }: { draft: FormDraft<T> | null; label: string; onResume: () => void; onDiscard: () => void }) {
  if (!draft) return null;
  const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(new Date(draft.updatedAt));
  return <section className="form-draft-resume" aria-labelledby="form-draft-resume-title"><div><p className="form-draft-resume-kicker">NIEDOKOŃCZONY FORMULARZ</p><h2 id="form-draft-resume-title">Masz niedokończony formularz</h2><p>{label} · ostatnio edytowany: {date}</p></div><div className="form-draft-resume-actions"><button type="button" className="form-draft-resume-primary" onClick={onResume}>Kontynuuj</button><button type="button" className="form-draft-resume-secondary" onClick={onDiscard}>Zacznij od nowa</button></div></section>;
}

"use client";

import type { FormDraft } from "@/lib/form-drafts";

export function FormDraftResume<T>({ draft, label, onResume, onDiscard, className }: { draft: FormDraft<T> | null; label: string; onResume: () => void; onDiscard: () => void; className?: string }) {
  if (!draft) return null;
  const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(new Date(draft.updatedAt));
  return <section className={className ? `form-draft-resume ${className}` : "form-draft-resume"} aria-labelledby="form-draft-resume-title"><div><p className="form-draft-resume-kicker">NIEDOKOŃCZONE ZGŁOSZENIE</p><h2 id="form-draft-resume-title">Masz niedokończone zgłoszenie</h2><p>{label} · ostatnio edytowany: {date}</p></div><div className="form-draft-resume-actions"><button type="button" className="form-draft-resume-primary" onClick={onResume}>Wznów</button><button type="button" className="form-draft-resume-secondary" onClick={onDiscard}>Zacznij od nowa</button></div></section>;
}

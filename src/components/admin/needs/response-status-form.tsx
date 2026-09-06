"use client";

import { useActionState, useCallback, useState } from "react";
import { changeResponseStatus, type NeedActionState } from "@/app/admin/(protected)/moje-miejsca/needs-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type ResponseStatus = "NEW" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED";
type DecisionStatus = "CONFIRMED" | "DECLINED";

const copy: Record<DecisionStatus, { title: string; description: string; confirm: string }> = {
  CONFIRMED: { title: "Potwierdzić udział tej osoby?", description: "Osoba zostanie zaliczona do potwierdzonych wolontariuszy dla tej potrzeby.", confirm: "Tak, potwierdź" },
  DECLINED: { title: "Odrzucić to zgłoszenie?", description: "Zgłoszenie pozostanie w historii i w razie potrzeby będzie można cofnąć tę decyzję.", confirm: "Tak, odrzuć" },
};

export function ResponseStatusForm({ responseId, placeId, responseStatus }: { responseId: string; placeId: string | null; responseStatus: ResponseStatus }) {
  const initialState = {} as NeedActionState;
  const [confirmState, confirmAction, confirmPending] = useActionState(changeResponseStatus.bind(null, responseId, placeId, "CONFIRMED"), initialState);
  const [declineState, declineAction, declinePending] = useActionState(changeResponseStatus.bind(null, responseId, placeId, "DECLINED"), initialState);
  const [undoState, undoAction, undoPending] = useActionState(changeResponseStatus.bind(null, responseId, placeId, "NEW"), initialState);
  const [openDecision, setOpenDecision] = useState<DecisionStatus | null>(null);
  const [lastAction, setLastAction] = useState<DecisionStatus | "NEW" | null>(null);
  const closeDecision = useCallback(() => setOpenDecision(null), []);
  const markDecisionSubmitted = useCallback(() => {
    if (openDecision) setLastAction(openDecision);
  }, [openDecision]);

  const success = undoState.success ?? confirmState.success ?? declineState.success;
  const error = undoState.error ?? confirmState.error ?? declineState.error;
  const activeDecision = openDecision === "CONFIRMED" ? confirmAction : declineAction;
  const activePending = openDecision === "CONFIRMED" ? confirmPending : declinePending;
  const activeCopy = openDecision ? copy[openDecision] : null;

  const decisionSucceeded = openDecision === "CONFIRMED" ? confirmState.success : openDecision === "DECLINED" ? declineState.success : undefined;

  return <div className="flex flex-wrap gap-2">{responseStatus === "NEW" ? <><button type="button" onClick={() => setOpenDecision("CONFIRMED")} disabled={confirmPending || declinePending} className="min-h-9 rounded-md border border-brand px-2.5 text-xs font-bold text-brand-strong disabled:opacity-60">{confirmPending ? "Zapisywanie…" : "Potwierdź"}</button><button type="button" onClick={() => setOpenDecision("DECLINED")} disabled={confirmPending || declinePending} className="min-h-9 rounded-md border border-border px-2.5 text-xs font-bold text-brand-strong disabled:opacity-60">{declinePending ? "Zapisywanie…" : "Odrzuć"}</button></> : responseStatus === "CONFIRMED" || responseStatus === "DECLINED" ? <form action={undoAction} onSubmit={() => setLastAction("NEW")}><button type="submit" disabled={undoPending} className="min-h-9 rounded-md border border-border px-2.5 text-xs font-bold text-brand-strong disabled:opacity-60">{undoPending ? "Zapisywanie…" : "Cofnij decyzję"}</button></form> : null}{success ? <div role="status" className="basis-full text-xs font-semibold text-brand-strong">{success}{lastAction !== "NEW" && lastAction !== null ? <form action={undoAction} className="inline"><button type="submit" disabled={undoPending} className="ml-2 underline underline-offset-2 hover:no-underline">Cofnij</button></form> : null}</div> : null}{error ? <p className="basis-full max-w-xs text-xs font-semibold text-red-800" role="alert">{error}</p> : null}{activeCopy && !decisionSucceeded ? <ConfirmDialog open title={activeCopy.title} description={activeCopy.description} confirmLabel={activeCopy.confirm} pending={activePending} formAction={activeDecision} onCancel={closeDecision} onConfirm={markDecisionSubmitted} /> : null}</div>;
}

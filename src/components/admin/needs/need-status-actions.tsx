"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { changeNeedStatusForm, publishNeed, type NeedActionState } from "@/app/admin/(protected)/moje-miejsca/needs-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const initialState: NeedActionState = {};

function PublishDialog({
  needId,
  placeId,
  onClose,
  onSuccess,
}: {
  needId: string;
  placeId: string | null;
  onClose: () => void;
  onSuccess: (state: NeedActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(publishNeed.bind(null, needId, placeId), initialState);

  useEffect(() => {
    if (state.success) {
      onSuccess(state);
      onClose();
    }
  }, [onClose, onSuccess, state]);

  return <ConfirmDialog open title="Opublikować tę potrzebę?" description="Po publikacji będzie widoczna publicznie w Dobrej Mapie i użytkownicy będą mogli zgłaszać chęć pomocy." confirmLabel="Tak, opublikuj" pending={pending} error={state.error} formAction={formAction} onCancel={onClose} />;
}

export function NeedStatusActions({ needId, placeId, status }: { needId: string; placeId: string | null; status: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishState, setPublishState] = useState<NeedActionState>(initialState);

  const openPublishDialog = () => {
    setPublishState(initialState);
    setPublishOpen(true);
  };

  const closePublishDialog = () => {
    setPublishOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? <button ref={triggerRef} type="button" onClick={openPublishDialog} className="min-h-10 rounded-lg border border-brand px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Opublikuj</button> : null}
        {status === "FILLED" ? <form action={changeNeedStatusForm.bind(null, needId, placeId, "PUBLISHED")}><button className="min-h-10 rounded-lg border border-brand px-3 text-sm font-bold text-brand-strong">Otwórz ponownie</button></form> : null}
        {status === "PUBLISHED" || status === "DRAFT" ? <form action={changeNeedStatusForm.bind(null, needId, placeId, "CANCELLED")}><button className="min-h-10 rounded-lg px-3 text-sm font-bold text-muted-foreground hover:bg-surface-muted">Anuluj</button></form> : null}
      </div>
      {status === "FILLED" ? <p className="mt-2 text-xs text-muted-foreground">Jeśli potrzebujesz kolejnych osób, najpierw zwiększ liczbę potrzebnych wolontariuszy w edycji, a potem otwórz potrzebę ponownie.</p> : null}
      {publishState.success ? <div role="status" className="mt-3 basis-full rounded-lg border border-brand/30 bg-brand-soft p-3 text-sm font-semibold"><p>Potrzeba została opublikowana.</p><p>Jest już widoczna publicznie.</p><Link href={`/potrzeby/${needId}`} className="mt-2 inline-flex min-h-10 items-center text-brand-strong underline-offset-2 hover:underline">Zobacz publicznie</Link></div> : null}
      {publishOpen ? <PublishDialog needId={needId} placeId={placeId} onClose={closePublishDialog} onSuccess={setPublishState} /> : null}
    </>
  );
}

"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useActionState } from "react";
import { markPlaceVerified, publishVerifiedPlace, type VerificationActionState } from "@/app/admin/(protected)/weryfikacja/actions";

const sourceOptions = [
  ["PHONE_CALL", "Rozmowa telefoniczna"],
  ["ORGANIZATION_EMAIL", "E-mail od placówki"],
  ["OFFICIAL_WEBSITE", "Oficjalna strona internetowa"],
  ["SOCIAL_MEDIA", "Oficjalne social media"],
  ["VISIT", "Wizyta"],
  ["OTHER", "Inne wiarygodne źródło"],
] as const;

export function VerificationActions({ placeId, canPublish, allowedToPublish, isProduction, publicationStatus }: { placeId: string; canPublish: boolean; allowedToPublish: boolean; isProduction: boolean; publicationStatus: string }) {
  const verifyAction = markPlaceVerified.bind(null, placeId);
  const [verifyState, verifyFormAction, verifyPending] = useActionState<VerificationActionState, FormData>(verifyAction, {});
  const [publishState, publishAction, publishPending] = useActionState<VerificationActionState, FormData>(async () => publishVerifiedPlace(placeId), {});
  return (
    <section className="rounded-lg border border-border bg-white p-4 sm:p-5">
      <h2 className="text-xl font-bold">Aktualna weryfikacja i publikacja</h2>
      <p className="mt-1 text-sm text-muted-foreground">Przewodnik 2025/2026 pozostaje źródłem historycznym. Aktualne potwierdzenie i publikacja są dwiema osobnymi decyzjami.</p>
      <form action={verifyFormAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Źródło aktualnej weryfikacji<select name="verificationSource" required defaultValue="" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3 font-normal"><option value="" disabled>Wybierz źródło</option>{sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-bold">URL źródła <span className="font-normal text-muted-foreground">(opcjonalnie)</span><input type="url" name="sourceUrl" className="mt-1 min-h-11 w-full rounded-lg border border-border px-3 font-normal" placeholder="https://…" /></label>
        <label className="text-sm font-bold sm:col-span-2">Notatka wewnętrzna <span className="font-normal text-muted-foreground">(opcjonalnie)</span><textarea name="note" rows={3} maxLength={1000} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal" /></label>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3"><div>{verifyState.error ? <p className="text-sm font-semibold text-urgent" role="alert">{verifyState.error}</p> : null}{verifyState.success ? <p className="text-sm font-semibold text-brand-strong" role="status">{verifyState.success}</p> : null}</div><button type="submit" disabled={verifyPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft disabled:opacity-60"><CheckCircle2 aria-hidden="true" size={18} />{verifyPending ? "Zapisuję…" : "Oznacz jako zweryfikowane"}</button></div>
      </form>
      {allowedToPublish ? <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Publikacja publiczna</h3><p className="mt-1 text-sm text-muted-foreground">{publicationStatus === "PUBLISHED" ? "Miejsce jest już opublikowane." : canPublish ? "Spełnia minimalne warunki publikacji." : "Najpierw uzupełnij wymagane dane i zakończ aktualną weryfikację."}</p></div>{publicationStatus !== "PUBLISHED" ? <form action={publishAction} onSubmit={(event) => { if (!window.confirm("Opublikować to miejsce w publicznej Mapie Dobra?")) event.preventDefault(); }}><button type="submit" disabled={!canPublish || !isProduction || publishPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-45"><Send aria-hidden="true" size={18} />{publishPending ? "Publikuję…" : "Opublikuj"}</button></form> : null}</div>
        {publishState.error ? <p className="mt-2 text-sm font-semibold text-urgent" role="alert">{publishState.error}</p> : null}{publishState.success ? <p className="mt-2 text-sm font-semibold text-brand-strong" role="status">{publishState.success}</p> : null}
      </div> : <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">Publikacja wymaga osobnego uprawnienia.</p>}
    </section>
  );
}

"use client";

import type { SystemState } from "@/lib/system/settings";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-md bg-brand px-5 text-sm font-extrabold text-[#10231e] hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Zapisywanie…" : "Zapisz zmianę"}</button>;
}

export function SystemSettingsForm({ state, action }: { state: SystemState; action: (formData: FormData) => void }) {
  return <form action={action} className="space-y-6" onSubmit={(event) => { const form = event.currentTarget; const selected = new FormData(form).get("mode"); const confirm = form.elements.namedItem("confirmMaintenance") as HTMLInputElement; if (selected === "MAINTENANCE" && state.mode !== "MAINTENANCE" && confirm.value !== "1") { if (!window.confirm("Włączyć tryb serwisowy? Publiczna aplikacja stanie się niedostępna.")) { event.preventDefault(); return; } confirm.value = "1"; } }}>
    <input type="hidden" name="version" value={state.version} /><input type="hidden" name="confirmMaintenance" value="0" />
    <fieldset><legend className="text-sm font-bold">Tryb publicznej aplikacji</legend><div className="mt-3 grid gap-3 md:grid-cols-3">{([ ["NORMAL", "Normalny", "Aplikacja działa normalnie."], ["READ_ONLY", "Tylko do odczytu", "Odczyt działa, zapisy są zablokowane."], ["MAINTENANCE", "Serwisowy", "Publiczna aplikacja pokazuje ekran serwisowy."] ] as const).map(([value, label, description]) => <label key={value} className="flex cursor-pointer gap-3 border border-border bg-white p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"><input type="radio" name="mode" value={value} defaultChecked={state.mode === value} className="mt-1" /><span><strong className="block">{label}</strong><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span></label>)}</div></fieldset>
    <div className="grid gap-5 lg:grid-cols-2"><label className="block text-sm font-bold">Tytuł strony serwisowej<input name="maintenanceTitle" defaultValue={state.maintenanceTitle} maxLength={200} className="mt-2 min-h-11 w-full rounded-md border border-border bg-white px-3 font-normal" /></label><label className="block text-sm font-bold">Treść strony serwisowej<textarea name="maintenanceMessage" defaultValue={state.maintenanceMessage} maxLength={2000} rows={3} className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 font-normal" /></label></div>
    <fieldset className="border-t border-border pt-5"><legend className="text-sm font-bold">Komunikat publiczny</legend><label className="mt-3 flex gap-3 text-sm font-bold"><input type="checkbox" name="noticeEnabled" defaultChecked={state.noticeEnabled} />Pokaż komunikat w aplikacji</label><label className="mt-4 block text-sm font-bold">Treść<textarea name="noticeText" defaultValue={state.noticeText} maxLength={1000} rows={3} className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 font-normal" /></label><div className="mt-4 flex flex-wrap gap-5"><label className="text-sm font-bold">Poziom<select name="noticeLevel" defaultValue={state.noticeLevel} className="ml-2 min-h-10 rounded-md border border-border bg-white px-2 font-normal"><option value="INFO">INFO</option><option value="WARNING">WARNING</option><option value="CRITICAL">CRITICAL</option></select></label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="noticeDismissible" defaultChecked={state.noticeDismissible} />Można zamknąć komunikat</label></div></fieldset>
    <SubmitButton />
  </form>;
}

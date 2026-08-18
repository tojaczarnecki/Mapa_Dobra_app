"use client";

import { useActionState } from "react";
import { createAdminUserAccessLink, revokeAdminUserSessions, setAdminUserActive, type UserActionState } from "@/app/admin/(protected)/uzytkownicy/actions";
import { CopyAccessLink } from "@/components/admin/users/copy-access-link";

function ActionForm({ action, label, danger = false }: { action: (state: UserActionState, data: FormData) => Promise<UserActionState>; label: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <div><form action={formAction}><button disabled={pending} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold ${danger ? "border-urgent text-[#8c2d0c] hover:bg-urgent-soft" : "border-border hover:bg-surface-muted"}`}>{pending ? "Przetwarzanie..." : label}</button></form>{state.error ? <p className="mt-2 text-xs font-semibold text-[#8c2d0c]">{state.error}</p> : null}{state.success ? <div className="mt-2 space-y-2"><p className="text-xs font-semibold text-brand-strong">{state.success}</p>{state.accessPath ? <CopyAccessLink path={state.accessPath} /> : null}</div> : null}</div>;
}

export function UserAccountActions({ userId, active }: { userId: string; active: boolean }) {
  return <div className="flex flex-wrap gap-3">
    <ActionForm action={revokeAdminUserSessions.bind(null, userId)} label="Wyloguj ze wszystkich urządzeń" />
    <ActionForm action={createAdminUserAccessLink.bind(null, userId, "PASSWORD_RESET")} label="Wygeneruj link resetu hasła" />
    {!active ? <ActionForm action={createAdminUserAccessLink.bind(null, userId, "INVITATION")} label="Wygeneruj nowe zaproszenie" /> : null}
    <ActionForm action={setAdminUserActive.bind(null, userId, !active)} label={active ? "Dezaktywuj konto" : "Reaktywuj konto"} danger={active} />
  </div>;
}

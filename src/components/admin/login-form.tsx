"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import {
  loginAdmin,
  type LoginActionState,
} from "@/app/admin/login/actions";
import { PasswordInput } from "@/components/admin/password-input";

const initialState: LoginActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 font-bold text-[#10231e] transition hover:bg-brand-strong hover:text-white disabled:cursor-wait disabled:opacity-65"
    >
      <LogIn aria-hidden="true" size={19} />
      {pending ? "Logowanie..." : "Zaloguj się"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAdmin, initialState);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const resetTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showResetHelp) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowResetHelp(false);
        resetTriggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showResetHelp]);

  function closeResetHelp() {
    setShowResetHelp(false);
    resetTriggerRef.current?.focus();
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="admin-email" className="mb-2 block text-sm font-bold">
          E-mail
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={320}
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-2 block text-sm font-bold">
          Hasło
        </label>
        <PasswordInput id="admin-password" name="password" autoComplete="current-password" minLength={12} maxLength={200} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="inline-flex min-h-11 items-center gap-2 font-semibold"><input type="checkbox" name="remember" className="h-5 w-5 accent-brand" />Zapamiętaj mnie</label><button ref={resetTriggerRef} type="button" aria-expanded={showResetHelp} aria-controls="admin-reset-help" onClick={() => setShowResetHelp(true)} className="min-h-11 font-semibold text-brand-strong underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-brand/40">Nie pamiętasz hasła?</button></div>
      {showResetHelp ? <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeResetHelp(); }}><section id="admin-reset-help" role="dialog" aria-modal="true" aria-labelledby="admin-reset-help-title" aria-describedby="admin-reset-help-description" className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><h2 id="admin-reset-help-title" className="text-lg font-bold">Nie możesz się zalogować?</h2><button type="button" onClick={closeResetHelp} aria-label="Zamknij" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-xl text-muted-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/40">×</button></div><p id="admin-reset-help-description" className="mt-3 text-sm leading-6 text-muted-foreground">W wersji pilota link do ustawienia nowego hasła generuje administrator Dobrej Mapy. Skontaktuj się z administratorem, aby otrzymać nowy link.</p><button type="button" onClick={closeResetHelp} className="mt-5 inline-flex min-h-11 rounded-lg border border-brand px-4 py-2 text-sm font-bold text-brand-strong hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/40">Zamknij</button></section></div> : null}
      {state.error ? (
        <p role="alert" className="rounded-lg border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm font-semibold text-foreground">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

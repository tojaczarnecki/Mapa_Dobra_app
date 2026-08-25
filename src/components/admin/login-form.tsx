"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
import { useTurnstileToken } from "@/components/security/turnstile-token";
import {
  loginAdmin,
  type LoginActionState,
} from "@/app/admin/login/actions";

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

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, formAction] = useActionState(loginAdmin, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const turnstile = useTurnstileToken();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      formData.set("turnstileToken", await turnstile.requestToken());
      startTransition(() => formAction(formData));
    } catch {
      startTransition(() => formAction(new FormData()));
    }
  }

  return (
    <form action={formAction} onSubmit={submit} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="admin-email" className="mb-2 block text-sm font-bold">
          E-mail
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="admin-password" className="block text-sm font-bold">
          Hasło
          </label>
          <Link href="/admin/reset-hasla" className="text-sm font-semibold text-brand-strong underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
            Nie pamiętasz hasła?
          </Link>
        </div>
        <input
          id="admin-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          minLength={12}
          maxLength={200}
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <button type="button" className="mt-2 min-h-11 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShowPassword((visible) => !visible)}>
          {showPassword ? "Ukryj hasło" : "Pokaż hasło"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-urgent/40 bg-urgent-soft px-4 py-3 text-sm font-semibold text-foreground">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

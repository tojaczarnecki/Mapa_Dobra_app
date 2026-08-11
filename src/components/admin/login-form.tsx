"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LogIn } from "lucide-react";
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

export function LoginForm() {
  const [state, formAction] = useActionState(loginAdmin, initialState);

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
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
          maxLength={200}
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
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

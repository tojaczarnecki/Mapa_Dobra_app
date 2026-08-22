"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-xl border border-border bg-surface p-6 text-center shadow-[0_10px_26px_rgb(17_24_39_/_6%)]" role="alert">
        <AlertTriangle aria-hidden="true" className="mx-auto text-urgent" size={36} />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Coś poszło nie tak.</h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">Spróbuj ponownie za chwilę. Jeśli problem się powtarza, wróć do strony głównej.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="touch-target rounded-lg bg-brand px-5 py-3 font-extrabold text-foreground hover:bg-brand-strong hover:text-white" onClick={() => reset()}>Spróbuj ponownie</button>
          <Link className="touch-target inline-flex items-center justify-center rounded-lg border border-border px-5 py-3 font-extrabold text-foreground hover:bg-surface-muted" href="/">Strona główna</Link>
        </div>
      </section>
    </div>
  );
}

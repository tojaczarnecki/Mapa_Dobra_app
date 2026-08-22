"use client";

import Link from "next/link";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-border bg-white p-6 text-center" role="alert">
      <h1 className="text-2xl font-bold">Nie udało się wczytać tej sekcji.</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Spróbuj ponownie. Jeśli błąd się powtarza, wróć do dashboardu.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="min-h-11 rounded-lg bg-brand px-4 font-bold" onClick={() => reset()}>Spróbuj ponownie</button>
        <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-bold" href="/admin">Dashboard</Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-xl border border-border bg-surface p-6 text-center">
        <SearchX aria-hidden="true" className="mx-auto text-brand-strong" size={36} />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Nie znaleźliśmy tej strony w panelu.</h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">Adres mógł się zmienić albo nie masz dostępu do tej części panelu.</p>
        <Link className="touch-target mt-5 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 font-extrabold text-foreground hover:bg-brand-strong hover:text-white" href="/admin">Wróć do panelu</Link>
      </section>
    </div>
  );
}

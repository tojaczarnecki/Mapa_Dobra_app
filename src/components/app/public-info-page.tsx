import Link from "next/link";

export function PublicInfoPage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-[#18364D]">{title}</h1>
        {children ?? <p className="mt-4 text-base leading-7 text-muted-foreground">Treść w przygotowaniu.</p>}
        <Link className="touch-target mt-6 inline-flex items-center justify-center rounded-lg border border-[#DCE3E8] px-5 py-3 font-medium text-[#18364D] hover:border-[#0F766E] hover:text-[#0F766E]" href="/">
          Wróć do Mapy Dobra
        </Link>
      </section>
    </div>
  );
}

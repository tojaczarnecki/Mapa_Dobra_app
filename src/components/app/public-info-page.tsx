import Link from "next/link";

export function PublicInfoPage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="utility-flow-page public-info-page mx-auto w-full max-w-[800px] px-4 py-10 sm:px-6 md:py-16 lg:px-8">
      <section className="public-info-content">
        <h1 className="text-3xl font-semibold text-[#18364D]">{title}</h1>
        {children ?? null}
        <Link className="touch-target mt-6 inline-flex items-center justify-center rounded-lg border border-[#DCE3E8] px-5 py-3 font-medium text-[#18364D] hover:border-[#0F766E] hover:text-[#0F766E]" href="/">
          Wróć do Dobrej Mapy
        </Link>
      </section>
    </div>
  );
}

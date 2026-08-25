import Link from "next/link";

export function PublicInfoPage({ title }: { title: string }) {
  return (
    <div className="public-info-page">
      <section className="public-info-content">
        <h1>{title}</h1>
        <p>Treść w przygotowaniu.</p>
        <Link className="public-info-back" href="/">
          Wróć do Mapy Dobra
        </Link>
      </section>
    </div>
  );
}

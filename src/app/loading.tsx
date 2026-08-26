export default function Loading() {
  return (
    <main className="route-loading" aria-busy="true" aria-label="Ładowanie strony">
      <div className="route-loading-bar" aria-hidden="true" />
      <p>Ładowanie…</p>
    </main>
  );
}

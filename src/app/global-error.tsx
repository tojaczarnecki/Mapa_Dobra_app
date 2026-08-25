"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, background: "#ffffff", color: "#17212b", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
          <section style={{ maxWidth: "560px", padding: "28px", border: "1px solid #e5e5e5", borderRadius: "12px", background: "#fff", textAlign: "center" }} role="alert">
            <h1 style={{ margin: 0, fontSize: "28px" }}>Coś poszło nie tak.</h1>
            <p style={{ lineHeight: 1.6 }}>Spróbuj ponownie za chwilę. Nie pokazujemy szczegółów technicznych tego błędu.</p>
            <button type="button" onClick={() => reset()} style={{ minHeight: "48px", border: 0, borderRadius: "8px", background: "#18364d", color: "#ffffff", padding: "10px 18px", fontWeight: 600 }}>Spróbuj ponownie</button>
          </section>
        </main>
      </body>
    </html>
  );
}

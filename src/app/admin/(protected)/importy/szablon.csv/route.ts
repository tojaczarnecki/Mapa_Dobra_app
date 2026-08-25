export function GET() {
  const headers = "Nazwa;Organizacja;Adres;Kod pocztowy;Miasto;Telefon;E-mail;WWW;Kategorie;Godziny;Warunki;Opis;Typ noclegu;Liczba miejsc\n";
  return new Response(`\uFEFF${headers}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="mapa-dobra-szablon-importu.csv"', "Cache-Control": "no-store" } });
}

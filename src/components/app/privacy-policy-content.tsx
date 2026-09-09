export function PrivacyPolicyContent() {
  return (
    <div className="space-y-7 leading-7 text-muted-foreground">
      <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-foreground">
        To jest techniczna informacja o prywatności dla wersji pilotażowej. Przed publicznym uruchomieniem dokument musi zostać uzupełniony o pełne dane administratora danych, dane kontaktowe, podstawy prawne, okresy przechowywania i informacje o odbiorcach danych właściwe dla finalnego operatora Dobrej Mapy.
      </p>

      <section aria-labelledby="privacy-scope">
        <h2 id="privacy-scope" className="text-xl font-bold text-foreground">Jakie dane mogą pojawić się w aplikacji</h2>
        <p className="mt-2">Zakres zależy od funkcji, z której korzystasz. Publiczne wyszukiwanie miejsc nie wymaga konta użytkownika. Jeżeli korzystasz z formularzy, możesz przekazać informacje potrzebne do obsługi konkretnego zgłoszenia.</p>
      </section>

      <section aria-labelledby="help-request-privacy">
        <h2 id="help-request-privacy" className="text-xl font-bold text-foreground">Przekazanie informacji o sytuacji</h2>
        <p className="mt-2">Formularz może zawierać opis sytuacji, przybliżoną lub dokładniejszą lokalizację oraz opcjonalny kontakt zgłaszającego. Kontakt nie jest wymagany — zgłoszenie może być anonimowe. Treść zgłoszenia i dokładna lokalizacja nie są przeznaczone do publicznego wyświetlania i trafiają do prywatnej kolejki obsługiwanej przez uprawnione osoby.</p>
        <p className="mt-2">Niedokończony formularz może być tymczasowo zapisany w pamięci sesji przeglądarki. Draft tego zgłoszenia nie zapisuje imienia, telefonu ani adresu e-mail.</p>
      </section>

      <section aria-labelledby="volunteer-needs-privacy">
        <h2 id="volunteer-needs-privacy" className="text-xl font-bold text-foreground">Zgłoszenia „Mogę pomóc”</h2>
        <p className="mt-2">Jeśli zgłaszasz chęć pomocy przy konkretnej potrzebie, formularz wymaga imienia oraz co najmniej jednego kanału kontaktu: telefonu lub e-maila. Dane służą obsłudze tego zgłoszenia, są dostępne dla uprawnionych osób obsługujących potrzebę i nie są publikowane publicznie.</p>
        <p className="mt-2">Możesz dodać krótką wiadomość, ale nie podawaj danych wrażliwych, których formularz nie wymaga.</p>
      </section>

      <section aria-labelledby="device-storage-privacy">
        <h2 id="device-storage-privacy" className="text-xl font-bold text-foreground">Dane zapisane na urządzeniu</h2>
        <p className="mt-2">Dobra Mapa używa pamięci przeglądarki m.in. do zapisanych miejsc, ustawienia prywatności, draftów formularzy i działania PWA. Zapisane miejsca pozostają na urządzeniu użytkownika i nie są synchronizowane z kontem. Szczegóły opisuje strona „Cookies i dane urządzenia”.</p>
      </section>

      <section aria-labelledby="location-privacy">
        <h2 id="location-privacy" className="text-xl font-bold text-foreground">Lokalizacja</h2>
        <p className="mt-2">Aplikacja może poprosić przeglądarkę o dostęp do lokalizacji tylko wtedy, gdy użytkownik wybierze funkcję, która tego wymaga. Zgoda na lokalizację jest obsługiwana przez przeglądarkę lub system urządzenia. W formularzu zgłoszenia sytuacji lokalizacja może zostać dołączona do prywatnego zgłoszenia.</p>
      </section>

      <section aria-labelledby="privacy-finalization">
        <h2 id="privacy-finalization" className="text-xl font-bold text-foreground">Przed publicznym startem</h2>
        <p className="mt-2">Ten dokument nie powinien zostać uznany za finalną politykę prywatności dla produkcyjnego operatora. Publikacja pilota wymaga uzupełnienia brakujących informacji organizacyjnych i prawnych oraz ponownego sprawdzenia ich zgodności z faktycznym działaniem systemu.</p>
      </section>
    </div>
  );
}

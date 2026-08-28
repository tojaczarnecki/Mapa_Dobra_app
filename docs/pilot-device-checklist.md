# Pilot urządzeniowy — Mapa Dobra

Ta checklista dotyczy ostatniego etapu przed pilotażem publicznym. Automatyczne CI nie zastępuje testu na prawdziwym telefonie, szczególnie dla PWA, GPS, safe-area i zachowania po utracie sieci.

## Zasada zaliczenia

Każdy scenariusz oznacz jako `OK`, `BŁĄD` albo `NIE DOTYCZY`. Przy błędzie zapisz model telefonu, wersję systemu, przeglądarkę, URL i krótki opis. Nie publikuj danych osoby korzystającej z pomocy ani danych z formularzy testowych.

## iPhone — Safari

- [ ] Pierwsze wejście na Start: logo, dwa główne wybory i dolna nawigacja są widoczne bez nachodzenia na siebie.
- [ ] Dolna nawigacja respektuje safe-area przy pasku Home.
- [ ] `Więcej → Zainstaluj Mapę Dobra` pokazuje instrukcję `Udostępnij → Dodaj do ekranu początkowego`.
- [ ] Po dodaniu do ekranu aplikacja uruchamia się bez paska adresu w trybie standalone.
- [ ] Ikona, nazwa i biały ekran startowy wyglądają poprawnie.
- [ ] Start, Pomoc, Mapa i Więcej działają w standalone.
- [ ] Wyszukiwanie naturalnym zdaniem prowadzi do sensownych filtrów i wyników.
- [ ] Mapa reaguje na przesuwanie; po ręcznym ruchu pojawia się `Szukaj w tym obszarze`.
- [ ] `Cała Łódź` usuwa filtr obszaru.
- [ ] Zgoda na lokalizację centruje mapę, a odmowa nie blokuje korzystania z aplikacji.
- [ ] Karta miejsca, telefon, trasa, `Czy mogę skorzystać?` i `Pokaż pomoc` są używalne jedną ręką.
- [ ] `Nocleg na dzisiaj` można przejść bez poziomego przewijania.
- [ ] `Uruchom pomoc` dochodzi szybko do pierwszej decyzji Tak/Nie.
- [ ] Formularz korekty nie jest zasłaniany przez klawiaturę i dolną nawigację.
- [ ] Po wyłączeniu internetu pojawia się komunikat offline; aplikacja nie przedstawia danych live jako aktualnych.
- [ ] Po ponownym włączeniu internetu komunikat znika i bieżące widoki znów korzystają z sieci.

## Android — Chrome

- [ ] Pierwsze wejście na Start nie ma skoków layoutu ani nakładania dolnej nawigacji.
- [ ] Instalacja PWA z komunikatu lub menu Chrome kończy się poprawnie.
- [ ] Aplikacja uruchamia się jako standalone z właściwą ikoną i nazwą.
- [ ] Przycisk Wstecz zachowuje przewidywalną historię między listą, mapą i szczegółem miejsca.
- [ ] Wyszukiwanie naturalnym zdaniem i filtry działają po otwarciu klawiatury ekranowej.
- [ ] Mapa: przesuwanie, zoom, `Szukaj w tym obszarze`, aktywny marker i karta miejsca są zsynchronizowane.
- [ ] Lokalizacja: zgoda działa; odmowa pozostawia działającą mapę Łodzi.
- [ ] Telefon i trasa otwierają właściwe akcje systemowe.
- [ ] `Nocleg na dzisiaj`, `Uruchom pomoc`, `Zgłoś miejsce` i korekta informacji mają pełne, niezasłonięte przyciski.
- [ ] Offline/reconnect zachowuje się bezpiecznie i bez udawania świeżych danych.

## Słaby internet i utrata połączenia

- [ ] Przy wolnym łączu najpierw pozostaje czytelny shell, a nie biały ekran.
- [ ] Błąd kafelków mapy nie blokuje dostępu do tekstowej listy miejsc.
- [ ] Utrata sieci na szczególe miejsca nie zmienia starej informacji w komunikat sugerujący, że jest świeża.
- [ ] Po powrocie sieci service worker sprawdza nowszą wersję aplikacji bez wymagania czyszczenia danych przeglądarki.

## Minimalny przebieg pilota

1. Start → `Potrzebuję pomocy`.
2. Wpisz naturalne zdanie, np. `potrzebuję ciepłego posiłku dzisiaj`.
3. Otwórz wynik, sprawdź warunki skorzystania i aktualność danych.
4. Przejdź na mapę, przesuń ją i użyj `Szukaj w tym obszarze`.
5. Wróć do całej Łodzi i wybierz inne miejsce.
6. Uruchom `Nocleg na dzisiaj`.
7. Uruchom `Uruchom pomoc` i przejdź pierwszy etap bez wysyłania rzeczywistych danych.
8. Zgłoś testową korektę wyłącznie na przygotowanym rekordzie testowym.
9. Sprawdź działanie po utracie i odzyskaniu sieci.
10. Zamknij PWA i uruchom ją ponownie z ikony na ekranie telefonu.

## Kryteria blokujące publikację

Pilota nie wypuszczamy, jeśli występuje choć jeden z poniższych problemów:

- dolna nawigacja lub safe-area zasłania główną akcję;
- mapa albo lista uniemożliwia dotarcie do danych miejsca;
- aplikacja pokazuje stare dane jako potwierdzone po utracie sieci;
- zgoda/odmowa GPS prowadzi do martwego ekranu;
- formularz pomocy lub noclegu nie daje się ukończyć na telefonie;
- PWA po aktualizacji wymaga ręcznego czyszczenia cache, żeby zobaczyć nową wersję;
- publicznie widoczny jest rekord TEST, DRAFT albo dane administracyjne.

## Po przejściu checklisty

Zapisz datę testu, urządzenia, systemy i przeglądarki. Dopiero wtedy oznacz wydanie jako kandydat do pilota. Produkcyjny deployment nadal wymaga osobnej checklisty wdrożenia, backupu, poprawnych zmiennych środowiskowych i sprawdzenia `/api/health`.

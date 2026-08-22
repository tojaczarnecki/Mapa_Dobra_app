# Checklista PWA przed premierą

- [ ] W Chrome pojawia się `Zainstaluj aplikację` / instalacja z menu.
- [ ] Ikona, nazwa i skrót aplikacji są poprawne.
- [ ] Aplikacja otwiera się w trybie standalone.
- [ ] `start_url` prowadzi do działającej strony.
- [ ] Po utracie internetu pojawia się bezpieczny komunikat, bez udawania świeżych danych.
- [ ] Nowa wersja service workera aktualizuje się po deploymencie.
- [ ] Po publikacji nowej wersji aplikacja nie pozostaje na starym shellu.

Instalację i zachowanie standalone trzeba potwierdzić ręcznie w docelowym Chrome; lokalny test HTTP nie zastępuje tego sprawdzenia.


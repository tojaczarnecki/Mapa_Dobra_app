# Checklista wdrożenia

## Przed deploymentem

- [ ] Wykonano i sprawdzono backup bazy.
- [ ] Skonfigurowano `DATABASE_URL`, `APP_BASE_URL`, `PUBLIC_DATA_MODE=production` i sekrety.
- [ ] Wybrano produkcyjny współdzielony rate limiter oraz zaufany proxy.
- [ ] Zweryfikowano konto SUPER_ADMIN i domenę HTTPS.
- [ ] Przeszły testy, lint, build i `prisma validate`.

## Deployment

1. Zainstaluj zależności z lockfile.
2. Uruchom `npx prisma migrate deploy`.
3. Uruchom build i `npm run start`.
4. Sprawdź `/api/health`.

Na produkcji używaj `prisma migrate deploy`, nigdy `prisma migrate dev` ani `prisma migrate reset`.

## Po deployment

- [ ] Działa strona główna, wyszukiwarka, mapa i szczegóły.
- [ ] Działa logowanie administratora.
- [ ] PRODUCTION jest publiczne, DEMO/TEST/DRAFT nie.
- [ ] Działa PWA i HTTPS.
- [ ] Utworzono pierwszy backup po wdrożeniu.
- [ ] Ustalono cykl `npm run db:housekeeping` zgodnie z mechanizmem hostingu.

Automatyczna wysyłka e-maili jest opcjonalnym etapem po premierze.

## Seed i importy

`admin:create`, import Caritas, migracja demo-data i skrypty TEST są operacjami manualnymi/development-only. Nie uruchamiaj ich automatycznie podczas produkcyjnego startu.

## Rollback

Kod można cofnąć do poprzedniej wersji po sprawdzeniu kompatybilności. Migracji bazy nie cofaj pochopnie; najpierw oceń, czy poprzedni kod działa z aktualnym schematem. Restore backupu do nowej bazy jest operacją awaryjną, wykonywaną po zatrzymaniu aplikacji i kontroli danych.


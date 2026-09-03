# Pilot staging deployment — IQHost

Ta ścieżka wdraża aktualny kandydat pilota z `release/pilot-current-ui` bez mieszania starej gałęzi `staging-uruchom-pomoc`.

## Zasada bezpieczeństwa

Workflow `.github/workflows/deploy-pilot-staging.yml` jest wyłącznie ręczny (`workflow_dispatch`). Nie uruchamia migracji bazy. Pobiera tylko wcześniej zbudowany i zakończony sukcesem artefakt `Build staging release artifact`, wysyła go przez SSH, atomowo przełącza symlink `current`, restartuje Passenger i wykonuje smoke test publicznych tras. Jeśli smoke nie przejdzie, workflow próbuje automatycznie wrócić do poprzedniego release.

## Wymagane sekrety GitHub Actions

- `STAGING_SSH_HOST` — host SSH IQHost;
- `STAGING_SSH_USER` — użytkownik SSH;
- `STAGING_SSH_PORT` — port SSH;
- `STAGING_SSH_PRIVATE_KEY` — prywatny klucz przeznaczony do wdrożeń;
- `STAGING_SSH_KNOWN_HOSTS` — przypięty wpis `known_hosts` dla serwera; nie zastępuj go `StrictHostKeyChecking=no`;
- `STAGING_APP_ROOT` — absolutny katalog aplikacji stagingowej, bez spacji;
- `STAGING_BASE_URL` — publiczny adres HTTPS stagingu, bez znaczenia czy kończy się `/`.

Klucz wdrożeniowy powinien mieć minimalne wymagane uprawnienia i nie powinien być używany do innych usług.

## Jednorazowe przygotowanie katalogu aplikacji na IQHost

W `STAGING_APP_ROOT` muszą istnieć:

- `server.cjs` — stabilny plik startowy Passenger;
- `.deployment-env` z dokładną treścią `staging`;
- konfiguracja Passenger wskazująca na `server.cjs`;
- zewnętrzny plik środowiska `/home/host11515/config/mapa-dobra/staging.env`, zgodnie z `server.cjs`.

Workflow sam tworzy katalogi `incoming`, `releases` i `tmp`, jeśli ich brakuje.

## Uruchomienie

1. GitHub → Actions → `Deploy pilot to IQHost staging`.
2. `release_run_id` zostaw puste, aby użyć najnowszego udanego artefaktu z `release/pilot-current-ui`, albo podaj konkretny run ID.
3. Zaznacz `confirm_staging`.
4. Uruchom workflow.

Workflow odrzuci run, jeśli nie zakończył się sukcesem albo nie pochodzi z `release/pilot-current-ui`.

## Co dzieje się na serwerze

`scripts/iqhost-release.sh`:

1. sprawdza `.deployment-env` i `server.cjs`;
2. sprawdza zawartość archiwum oraz odrzuca `.env`, `.git`, migracje i próbę podmiany `server.cjs`;
3. odczytuje `.next/BUILD_ID`;
4. rozpakowuje release do `releases/<BUILD_ID>`;
5. zapisuje poprzedni target `current` w `.previous-release`;
6. atomowo przełącza `current`;
7. dotyka `tmp/restart.txt`, aby Passenger przeładował aplikację.

Po aktywacji workflow sprawdza `/api/health`, `/`, `/mapa` i `/znajdz-nocleg`. Przy błędzie wykonuje `rollback` i kończy się statusem failed.

## Baza danych

Ten workflow celowo **nie wykonuje** `prisma migrate deploy`. Migracje mają osobną kontrolę, backup i jawne zatwierdzenie. Wdrożenie kodu nie może przypadkowo zmienić schematu bazy tylko dlatego, że ktoś uruchomił smoke stagingu.

## Ręczny status / rollback na serwerze

```bash
bash "$STAGING_APP_ROOT/deploy-release.sh" status "$STAGING_APP_ROOT"
bash "$STAGING_APP_ROOT/deploy-release.sh" rollback "$STAGING_APP_ROOT" staging
```

Do testu na fizycznych telefonach używamy `docs/pilot-device-checklist.md` i issue `#15`.

# Transfer danych produkcyjnych do Neon

Mechanizm rozdziela lokalne źródło (`DATABASE_URL`) od docelowej bazy (`TARGET_DATABASE_URL`). Domyślnie nic nie zapisuje do bazy.

## Zakres

Eksport obejmuje wyłącznie miejsca `recordKind=PRODUCTION` oraz potrzebne organizacje, kategorie, godziny, warunki, dostępność, noclegi, historię dostępności i kolejkę importową powiązaną z tymi miejscami. Rekordy `DEMO` i `TEST`, lokalni administratorzy, hashe haseł, sesje, tokeny i `AuditLog` nie są eksportowane. Statusy miejsc są kopiowane bez publikowania szkiców.

## 1. Dry-run źródła lokalnego

```bash
npm run db:export-production -- --dry-run
```

To tylko odczyt i raport. Nie tworzy rekordu w Neon.

## 2. Snapshot bez zapisu do Neon

Po sprawdzeniu raportu:

```bash
npm run db:export-production -- --write --output=backups/production-export.json
```

Plik trafia do ignorowanego przez Git katalogu `backups/`. Nie wysyłaj go publicznie. Zawiera dane placówek, więc przechowuj go jak poufny backup operacyjny.

## 3. Dry-run importu do Neon

Ustaw `TARGET_DATABASE_URL` w lokalnym środowisku lub przekaż ją bezpiecznie przez menedżer sekretów. Nie zastępuje ona `DATABASE_URL`.

```bash
TARGET_DATABASE_URL='postgresql://...neon.tech/...?...' \
npm run db:import-production -- --dry-run --file=backups/production-export.json
```

Importer odrzuca `localhost`, `127.0.0.1`, `::1` i domeny `.local`. Sprawdza, czy docelowa baza nie zawiera danych aplikacji. Dopuszczalny jest wcześniej utworzony, aktywny produkcyjny administrator.

## 4. Wymagane powiązanie kontaktów weryfikacyjnych

Kontakty `Wymaga kontaktu` mają wymagane powiązanie z administratorem. Ponieważ lokalni administratorzy nie są eksportowani, najpierw utwórz w Neon świadome, produkcyjne konto `SUPER_ADMIN`, odczytaj jego UUID i użyj go jako mapowania:

```bash
TARGET_DATABASE_URL='postgresql://...neon.tech/...' \
npm run db:import-production -- --dry-run \
  --file=backups/production-export.json \
  --verification-admin-id='UUID_PRODUKCYJNEGO_ADMINA'
```

## 5. Właściwy zapis

Wykonuj dopiero po zaakceptowaniu obu raportów:

```bash
TARGET_DATABASE_URL='postgresql://...neon.tech/...' \
npm run db:import-production -- --write \
  --file=backups/production-export.json \
  --verification-admin-id='UUID_PRODUKCYJNEGO_ADMINA'
```

Importer wykonuje inserty w jednej transakcji, sprawdza integralność relacji i wycofuje całość przy błędzie. Nie używa `DATABASE_URL` jako celu, nie wykonuje migracji i nie zmienia schematu. Po zapisie sprawdź raport oraz publiczną widoczność: `PUBLISHED` pozostaje publiczne, `DRAFT` pozostaje niepubliczne.

## Ważne

Nie uruchamiaj `--write` na lokalnym Postgresie ani na bazie zawierającej dane. Nie wykonuj `migrate reset` ani `db push`. Przed właściwym importem wykonaj backup Neon zgodnie z procedurą dostawcy.

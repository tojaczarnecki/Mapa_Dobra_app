# Backup i odtworzenie bazy

## Backup

Uruchom w katalogu projektu:

```bash
npm run db:backup
```

Polecenie korzysta z `DATABASE_URL`, zapisuje nowy plik custom dump w `backups/` i sprawdza jego listę obiektów przez `pg_restore --list`. Każdy plik ma znacznik czasu i nie nadpisuje poprzednich kopii.

## Sprawdzenie

Jeśli polecenie zakończy się sukcesem, archiwum jest czytelne dla `pg_restore`. Można wykonać dodatkową kontrolę:

```bash
pg_restore --list backups/NAZWA.dump
```

## Restore do nowej bazy

1. Utwórz osobną bazę testową.
2. Ustaw tymczasowe `DATABASE_URL` na tę bazę.
3. Odtwórz dump, na przykład: `pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/NAZWA.dump`.
4. Porównaj liczbę tabel i najważniejszych rekordów.
5. Usuń bazę testową po zakończeniu kontroli.

Nigdy nie wykonuj testowego restore bezpośrednio do aktualnej bazy `mapa_dobra`.

## Awaryjne odtworzenie

Zatrzymaj aplikację, zabezpiecz aktualną bazę osobnym backupem, uzgodnij właściwy punkt odtworzenia, utwórz nową bazę i odtwórz do niej kopię. Dopiero po sprawdzeniu schematu, migracji i liczby rekordów przełącz `DATABASE_URL` i uruchom aplikację. Nie cofaj migracji Prisma pochopnie.


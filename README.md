# Mapa Dobra

Aplikacja publiczna przygotowana w Next.js, TypeScript i Tailwind CSS.

## Skrypty

- `npm run dev` - lokalny serwer developerski
- `npm run lint` - ESLint
- `npm run build` - build produkcyjny
- `npm test` - testy walidacji i zabezpieczeń zgłoszeń
- `npm run prisma:validate` - walidacja schematu Prisma
- `npm run prisma:generate` - generowanie klienta Prisma

## Warstwa danych

Publiczne zgłoszenia zmian i nowych miejsc są zapisywane w PostgreSQL przez
Prisma. Skopiuj `.env.example` do lokalnego `.env` i ustaw `DATABASE_URL`, a
następnie zastosuj migracje poleceniem `npx prisma migrate deploy`.

Dane kontaktowe zgłaszających służą wyłącznie moderacji i nie są udostępniane
przez publiczne endpointy.

## Trasy

- `/`
- `/szukaj`
- `/mapa`
- `/znajdz-nocleg`
- `/admin`

Panel administratora nie jest jeszcze zaimplementowany. Publiczne widoki miejsc
nadal korzystają z danych demonstracyjnych; nie zostały przeniesione do bazy.

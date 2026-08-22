# IQHost HS50 / Setup Node.js App

## Zalecane ustawienia

- **Node.js version:** `20.x` lub nowsza, zgodna z `>=20.9.0`.
- **Application mode:** `Production`.
- **Application root:** katalog projektu, na przykład `mapa-dobra`.
- **Application startup file:** `server.js`.
- **Application URL:** ustalana osobno; aplikacja działa z root własnej domeny lub subdomeny.

Nie wpisuj `/mapa-dobra` jako `basePath`, nie dodawaj prefiksu do URL-i i nie ustawiaj portu `3000` ręcznie. Port przekazuje Passenger przez zmienną `PORT`.

## Przygotowanie aplikacji

W katalogu projektu:

```bash
npm ci
npx prisma generate
npm run build
```

Passenger uruchamia:

```bash
NODE_ENV=production node server.js
```

Nie instaluj PM2. Procesem zarządza Passenger.

## ENV wymagane do pierwszego uruchomienia

W DirectAdmin → Setup Node.js App → Environment variables należy później ustawić:

- `NODE_ENV=production`
- `PORT` — wartość zapewniana przez Passenger; nie wpisuj ręcznie, jeśli panel ustawia ją automatycznie
- `DATABASE_URL` — zewnętrzny PostgreSQL, np. Neon; nie używaj lokalnego Postgres.app
- `APP_BASE_URL` — pełny adres aplikacji, np. `https://preview.example.pl`
- `PUBLIC_DATA_MODE=production`
- `GEOCODER_USER_AGENT`
- `GEOCODER_CONTACT_EMAIL`
- `RATE_LIMIT_MODE=upstash`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TRUSTED_PROXY_MODE=vercel` tylko wtedy, gdy rzeczywisty reverse proxy jest zaufany i przekazuje poprawny adres klienta

Sekretów nie wpisuj do repozytorium ani do plików `.env` przesyłanych razem z kodem.

## Konfigurowane później

- produkcyjna domena/subdomena i odpowiadający `APP_BASE_URL`,
- Neon `DATABASE_URL`,
- Upstash REST URL/token albo adapter lokalnego Redis, jeśli IQHost udostępni go później,
- polityka backupów i ręczny cykl `db:housekeeping`,
- produkcyjny SUPER_ADMIN utworzony jawnie, bez lokalnego konta developerskiego.

## Prisma i PostgreSQL

Prisma pozostaje przy PostgreSQL. Produkcja używa `npx prisma migrate deploy`; nie używaj `prisma migrate dev`, `db push` ani `migrate reset`. Obecna konfiguracja korzysta z jednego `DATABASE_URL`; `DIRECT_URL` nie jest potrzebny, dopóki dostawca PostgreSQL nie wymusi osobnego połączenia administracyjnego.

## PWA i bezpieczeństwo

`server.js` przekazuje żądania do Next.js, więc zachowane są route handlers, security headers, manifest, `/sw.js`, ikony i strona offline. Custom server nie ma własnego cache ani własnej obsługi nagłówków.


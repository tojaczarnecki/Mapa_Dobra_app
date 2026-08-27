# Browser smoke

Browser tests use Playwright and a disposable PostgreSQL database. They do not
use staging or production data and keep external providers disabled or outside
the test path.

For a local run:

1. Set `DATABASE_URL` and `TEST_DATABASE_URL` to a disposable PostgreSQL database;
   `TEST_DATABASE_URL` must pass `scripts/test-env-guard.mjs`.
2. Set `TEST_BASE_DATABASE_URL` to a different non-test target value for the
   guard comparison.
3. Run `npx prisma migrate deploy`, `npm run seed:e2e`, then `npm run build`.
4. Run `npm run test:e2e` or `npm run test:a11y`.

CI creates the PostgreSQL service, applies the real migration history, seeds
test-only records, and removes the service when the job ends. Install browser
binaries locally with `npx playwright install chromium` when needed.

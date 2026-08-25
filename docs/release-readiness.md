# Release Readiness

## Current code status

**READY FOR RELEASE CANDIDATE** from the validated code series:

- unit tests: **169/169 PASS**,
- isolated integration suites: **PASS**,
- CMS: **PASS**,
- RBAC: **PASS**,
- isolated migration run: **23/23 migrations PASS**,
- lint: **PASS**,
- production build: **PASS**.

This is a code-readiness statement. It does not mean that production secrets,
external providers, scheduler jobs, backups, or deployment access have already
been configured.

## Pre-deploy configuration

Before production deployment, confirm the real values in the deployment secret
store for `APP_BASE_URL`, `DATABASE_URL`, `PUBLIC_DATA_MODE`, rate limiting and
Upstash, Turnstile, the mail provider, VAPID, the operator reminder scheduler,
and geocoder identity/contact settings. Confirm a current backup and recovery
point. Do not infer that any of these services are active from this document.

Required production checks include:

- `APP_BASE_URL` points to the production HTTPS origin;
- `DATABASE_URL` is the intended production database and `PUBLIC_DATA_MODE=production`;
- `RATE_LIMIT_MODE`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` are configured;
- Turnstile variables are configured when `TURNSTILE_MODE=required`;
- mail adapter variables are configured for reset and organization mail;
- VAPID public/private/contact variables are present server-side;
- `OPERATOR_REMINDER_CRON_SECRET` is stored in the scheduler secret store;
- `GEOCODER_USER_AGENT` and `GEOCODER_CONTACT_EMAIL` identify the service;
- backup/recovery point is recorded before schema deployment.

## Staging smoke checklist

Check the following against the release candidate, including authenticated
flows where applicable:

- `/api/health`, homepage, search, map, place detail, and nocleg;
- `Uruchom pomoc`, new place, `Zgłoś zmianę`, and Encyklopedia;
- admin login/reset and organization registration, verification, approval, claim, and `Moje miejsca`;
- quick availability and spreadsheet import;
- mail delivery and Turnstile behavior;
- PWA install, offline/reconnect behavior;
- manual viewport smoke from 390 through 1440 px.

## Production migration procedure

Before production migrations, take and verify a database backup. Then inspect
`prisma migrate status` and run `prisma migrate deploy` from the reviewed build
artifact. Never run `prisma migrate dev` against production. These operations
are release instructions only and were not executed during this staging task.

## Hosting notes

For IQHost/Passenger-style hosting, build the application on a trusted Mac or
CI runner and deploy the reviewed artifact. Do not perform the heavy Next.js
build on the hosting server. Restart Passenger in a controlled maintenance
window and verify `/api/health` after restart.

## Isolated integration database

Destructive suites require `TEST_DATABASE_URL`. The guard rejects a missing value, an exact match with `DATABASE_URL`, and URLs whose database/schema does not contain `test`, `ci`, or `isolated`.

1. Provision a separate local or Neon test database.
2. Set `TEST_DATABASE_URL` to that database only.
   When a suite imports server actions directly, set `DATABASE_URL` to the same isolated URL and preserve the original non-test target in `TEST_BASE_DATABASE_URL`; the guard compares against that explicit base target.
3. Run `npx prisma migrate deploy` against `TEST_DATABASE_URL`.
4. Seed minimal `TEST` places and an administrator fixture.
5. Run `npm run test:integration`, `npm run test:cms`, and `npm run test:rbac`.
6. Drop/reset the isolated database after the run.

No production database is provisioned or modified by these scripts.

## Anti-abuse coverage

The shared client hook `useTurnstileToken` loads the provider once per page, obtains a fresh token at submit time, resets the widget before execution, and rejects expired/provider-error tokens. Server actions and API routes verify the token server-side whenever `TURNSTILE_MODE=required`; disabled mode does not load or call the provider.

Protected flows: help request, new-place submission, place correction/update, organization registration, admin login, password-reset request, and authenticated place-access claim. The claim still requires an authenticated active organization membership, remains `PENDING`, and never grants place access automatically. Password reset keeps its neutral response regardless of account or challenge outcome; admin login keeps the neutral invalid-credentials response for challenge failures.

## Scheduler

Production scheduler requirement: call `POST /api/cron/operator-reminders` once daily, preferably at 09:00 Europe/Warsaw. Send `x-cron-secret` from the scheduler secret store. A `200` response reports `sent` and `skipped`; retry non-2xx responses with bounded exponential backoff. Delivery rows are deduplicated per subscription, place, and Warsaw calendar day. Failed deliveries can be retried; sent deliveries are skipped. Inactive users/accesses, non-accommodation places, non-STALE records, and subscriptions with `localAlerts=false` are skipped.

The endpoint does not expose the secret or a public health status. Until the external scheduler is configured, the application makes no claim that operator reminders are active.

## Migration order

Apply pending migrations in filename order with `prisma migrate deploy`:

`20260825120000_add_knowledge_articles` → `20260825143000_add_web_push` → `20260825150000_add_new_place_coordinates` → `20260825153000_add_place_update_coordinates` → `20260825170000_bind_push_to_admin` → `20260825180000_add_organization_registration` → `20260825200000_extend_import_batches_for_spreadsheets` → `20260825210000_add_organization_memberships` → `20260825213000_link_new_place_submissions_to_organizations`.

The release code is backward-compatible with the membership migration being absent: login continues to work and organization features remain unavailable until migration. The final two migrations are additive. The membership migration backfills only approved registrations with a non-null organization, uses a unique constraint, and is idempotent with `ON CONFLICT DO NOTHING`. The new-place link is nullable and uses `ON DELETE SET NULL`. No pending migration drops production data or adds a new required column to existing rows.

## Production environment checklist

Required names to review: `DATABASE_URL`, `APP_BASE_URL`, `PUBLIC_DATA_MODE`, `RATE_LIMIT_MODE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `TRUSTED_PROXY_MODE`, `GEOCODER_USER_AGENT`, `GEOCODER_CONTACT_EMAIL`, `ADMIN_RESET_MAIL_URL`, `ADMIN_RESET_MAIL_TOKEN`, `TURNSTILE_MODE`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_MODE`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `OPERATOR_REMINDER_CRON_SECRET`.

| Feature | Required environment | Optional environment | Failure behavior |
| --- | --- | --- | --- |
| Login | `DATABASE_URL`, rate limiter | `TRUSTED_PROXY_MODE` | invalid credentials or unavailable service |
| Password reset | `DATABASE_URL`, `APP_BASE_URL`, mail adapter | `ADMIN_RESET_MAIL_URL`, `ADMIN_RESET_MAIL_TOKEN` | token flow remains safe; delivery unavailable is reported |
| Public submissions | `DATABASE_URL`, production rate limiter | Turnstile | rate limit/validation rejection |
| Organization registration | `DATABASE_URL`, mail adapter | Turnstile | rejected unless verified and valid |
| Turnstile | all four Turnstile variables when required | disabled mode | production validation fails on missing keys; provider failure rejects protected submissions except help graceful degradation |
| Web Push | VAPID variables | notification preferences | unavailable configuration returns non-success; no fake subscription |
| Operator reminders | `OPERATOR_REMINDER_CRON_SECRET`, VAPID variables, scheduler | none | endpoint returns 401 without secret; scheduler must be configured externally |
| Geocoder | geocoder user agent/contact, rate limiter | none | admin geocoding fails closed |

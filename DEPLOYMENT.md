# GroundCore Deployment Plan

## Mustang v1 target
Deploy GroundCore as a single HTTPS app:
- Node backend serves API + static frontend
- Supabase provides hosted Postgres
- PWA installability works from the same origin

## What is already in place
- Supabase schema + seed users
- backend API for orders/messages/alerts/thread reads/login
- static serving for `/` and `/kiosk`
- PWA manifest + service worker shell

## Recommended hosting
Use a simple Node-friendly host first:
- Render
- Railway
- Fly.io
- or any basic VPS/PaaS that can run `npm run dev:server`

## Required environment variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `CHECKIN_SECRET` (recommended distinct value for kiosk session issuance)
- optional: `ALLOWED_ORIGINS` (comma-separated exact origins when frontend/API cross origins)
- optional: `SECURE_COOKIES=true` for hosted TLS-terminated environments if secure cookie inference is insufficient
- optional: `DATABASE_SSL_MODE=verify-full|require|no-verify|disable` (default `verify-full`; for Supabase/shared hosting, set `require` if your runtime does not trust the presented certificate chain)
- optional: `DATABASE_SSL_CA` (PEM CA contents, literal or `\n`-escaped, when you want verified TLS with a provider-specific CA chain)
- optional: `PORT`
- optional: `HOST` (set deliberately for the deployment target)

## Recommended target
Use the included `render.yaml` for the fastest first hosted deployment.
There is also a Render walkthrough in `docs/DEPLOY_RENDER.md`.

## Runtime command
```bash
npm run dev:server
```

On startup in shared/Postgres mode, the server now applies `schemaSql` before listening so a fresh deploy can initialize required tables automatically.

GroundCore enables TLS automatically for non-local Postgres connections. By default it verifies the server certificate (`DATABASE_SSL_MODE=verify-full`). If your Supabase/runtime combination currently fails with `self-signed certificate in certificate chain`, either provide the correct CA via `DATABASE_SSL_CA` or set `DATABASE_SSL_MODE=require` to keep TLS on without certificate verification until the trust chain is fixed upstream.

## Routes
- `/` → GroundCore ops app
- `/kiosk` → customer check-in kiosk
- `/manifest.webmanifest`
- `/sw.js`
- `/assets/*`
- `/src/*`
- `/health`
- `/bootstrap`

## Immediate pilot credentials
Seeded users currently are:
- `steve / groundcore-steve`
- `tacie / groundcore-tacie`
- `lindsey / groundcore-office`
- `lizbeth / groundcore-office`
- `amanda / groundcore-office`
- `ramp / groundcore-ramp`
- `neil / groundcore-ramp`
- `john / groundcore-ramp`
- `wade / groundcore-ramp`
- `todd / groundcore-ramp`
- `clark / groundcore-ramp`
- `mark / groundcore-ramp`
- `kiosk / groundcore-kiosk`

Change these before broader rollout.

## Recommended next tightening
1. complete first-run operator credential rotation for every seeded account and retire any shared temporary passwords
2. stable deploy target + custom subdomain
3. HTTPS/PWA install testing on iPhone and desktop
4. run `npm run smoke:auth-cookie` against a shared-mode server (or wire it into CI) to verify login cookie issuance, authenticated `/bootstrap` access, and logout revocation

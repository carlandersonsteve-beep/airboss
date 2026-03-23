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
- optional: `PORT`

## Recommended target
Use the included `render.yaml` for the fastest first hosted deployment.
There is also a Render walkthrough in `docs/DEPLOY_RENDER.md`.

## Runtime command
```bash
npm run dev:server
```

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
1. backend role enforcement on write endpoints
2. proper password hashing
3. stable deploy target + custom subdomain
4. HTTPS/PWA install testing on iPhone and desktop

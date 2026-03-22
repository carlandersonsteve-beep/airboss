# AirBoss Deployment Plan

## Mustang v1 target
Deploy AirBoss as a single HTTPS app:
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
- optional: `PORT`

## Runtime command
```bash
npm run dev:server
```

## Routes
- `/` → AirBoss ops app
- `/kiosk` → customer check-in kiosk
- `/manifest.webmanifest`
- `/sw.js`
- `/assets/*`
- `/src/*`
- `/health`
- `/bootstrap`

## Immediate pilot credentials
Seeded users currently are:
- `steve / airboss-steve`
- `tacie / airboss-tacie`
- `lindsey / airboss-office`
- `lizbeth / airboss-office`
- `amanda / airboss-office`
- `ramp / airboss-ramp`
- `neil / airboss-ramp`
- `john / airboss-ramp`
- `wade / airboss-ramp`
- `todd / airboss-ramp`
- `clark / airboss-ramp`
- `mark / airboss-ramp`
- `kiosk / airboss-kiosk`

Change these before broader rollout.

## Recommended next tightening
1. backend role enforcement on write endpoints
2. proper password hashing
3. stable deploy target + custom subdomain
4. HTTPS/PWA install testing on iPhone and desktop

# AirBoss Backend Scaffold

This is the first thin shared-backend scaffold for AirBoss.

## Goal
Move AirBoss away from browser-local-only state and toward a shared operations backbone for:
- orders
- order threads
- alerts
- thread read state

## Current state
The backend now uses:
- built-in Node HTTP server
- `pg` for Postgres connectivity

It provides:
- `GET /health`
- `GET /bootstrap`
- `GET /schema.sql`
- `GET /orders`
- `GET /alerts`
- `GET /orders/:id/messages`
- `POST /orders`
- `POST /orders/:id/messages`
- `POST /alerts`
- `POST /orders/:id/read`

These endpoints are now wired for real Postgres-backed persistence.

If `DATABASE_URL` is missing, data endpoints will return a clear configuration error instead of silently pretending to persist.

## Run
```bash
npm run dev:server
```

Default port:
- `8787`

Override with:
```bash
PORT=8788 npm run dev:server
```

## Database
Datastore:
- Postgres

Set:
```bash
export DATABASE_URL='postgres://USER:PASS@HOST:5432/DBNAME'
```

The initial schema is in:
- `server/db/schema.js`

Print it with:
```bash
npm run db:schema
```

## Recommended next step
Replace scaffold route bodies with real Postgres-backed repositories for:
1. bootstrap
2. orders
3. order messages
4. alerts
5. thread reads

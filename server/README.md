# AirBoss Backend Scaffold

This is the first thin shared-backend scaffold for AirBoss.

## Goal
Move AirBoss away from browser-local-only state and toward a shared operations backbone for:
- orders
- order threads
- alerts
- thread read state

## Current state
This scaffold intentionally uses only Node built-ins so it can run immediately without package installs.

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

Right now these endpoints are **shape-only** and return scaffold responses.

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
Planned datastore:
- Postgres

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

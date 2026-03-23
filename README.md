# GroundCore

GroundCore is a standalone FBO operations system.

It is intended to manage:
- aircraft arrivals
- fuel and service orders
- ramp and front desk coordination
- customer interactions
- internal communication

This is being developed as a real product, not just an internal tool.

## Local run

GroundCore is currently a plain HTML front end served by a small Node backend.
That backend is the right integration point for shared persistence.

1. Copy env template:
   ```bash
   cp .env.example .env
   ```
2. Set `DATABASE_URL` in `.env` if you want shared Postgres persistence.
   - If `DATABASE_URL` is missing, the backend now uses a local file-backed store for local development.
   - Supabase is appropriate here only as the hosted Postgres backing store behind `DATABASE_URL`.
   - For hosted deployment, also set `SESSION_SECRET`.
3. Start the app:
   ```bash
   npm run dev
   ```
   Or for a durable local test session that keeps running even if the parent terminal/agent process exits:
   ```bash
   npm run local:start
   ```
   Check status with:
   ```bash
   npm run local:status
   ```
4. Open:
   - Ops UI: <http://localhost:8792/>
   - Kiosk: <http://localhost:8792/kiosk>

Useful checks:
```bash
curl http://localhost:8792/health
curl http://localhost:8792/bootstrap
npm run db:schema
```

Current files:
- `index.html` — main operations interface
- `kiosk.html` — customer check-in interface
- `server/` — thin backend and Postgres integration
- `src/` — runtime/domain refactor scaffold
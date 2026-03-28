# Current State — GroundCore (updated 2026-03-28)

## App Structure
- `index.html` — main ops interface (ramp + front desk views, internal chat, order management)
- `kiosk.html` — customer self-check-in kiosk
- `server/` — Node HTTP backend, local file store (no DB yet — Postgres wiring exists but not deployed)
- `src/` — refactor scaffold (runtime bridge, extracted UI components, domain/service layers)
- `assets/` — horse.mp3, icons

## How to Run
```
npm run dev
```
Starts server at http://localhost:8792. No `.env` required for local mode.

## Current Capabilities
- Customer check-in via kiosk (tail-first returning aircraft flow)
- Service orders with ramp workflow (pending → in_progress → ready_for_front_desk → closed)
- Focused ramp service panel (one aircraft at a time)
- Front desk view with ready-to-bill queue
- Order-level message threads (ramp ↔ front desk)
- General ops chat with horse whinny notification sound
- Local file persistence (server/data/local-store.json)
- PWA installable (manifest + service worker shell)
- Session-based auth with roles: ADMIN, OFFICE, RAMP, KIOSK
- First-login forced password change flow

## Pilot Accounts (local)
| Username | Role   | Default Password        |
|----------|--------|-------------------------|
| steve    | ADMIN  | Airboss-Steve-Prod-2!   |
| tacie    | OFFICE | (forced change on login)|
| ramp     | RAMP   | (forced change on login)|
| kiosk    | KIOSK  | (forced change on login)|

## Known State
- Running entirely off local Node server + file store
- NOT deployed to Render yet — all testing is on localhost
- Postgres schema exists but only activates with DATABASE_URL set
- WORKLOG.md is stale — git log is the source of truth for recent changes

## Next Milestone
Render + Supabase deployment for real multi-device pilot with Lindsey, Neil, John.

## Weak Points / Tech Debt
- `index.html` still large; extracted components cover major surfaces but inline code remains
- Browser globals (window.AirBossDeps, etc.) are transitional, not final architecture
- No build system — module reuse constrained by browser loading reality
- Google Sheets/Forms sync remnants still in codebase, not actively used

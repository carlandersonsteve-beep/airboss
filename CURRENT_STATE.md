# Current State — GroundCore (updated 2026-04-24)

## App Structure
- `index.html` — main ops interface (ramp + front desk views, auth/session wiring, extracted component loading)
- `kiosk.html` — customer self-check-in kiosk
- `server/` — Node backend with local file-store mode and shared/Postgres mode when `DATABASE_URL` is configured
- `src/` — extracted UI components, runtime bridge, domain/service layers
- `assets/` — media / icons

## How to Run
```bash
bash scripts/local-server.sh restart
```
Starts server at http://localhost:8792.

## Current Capabilities
- Customer check-in via kiosk
- Shared-mode backend support with role-based auth
- Service orders with ramp workflow:
  - pending
  - in_progress
  - ready_for_front_desk
  - closed/finalized
- Focused ramp service panel
- Front Desk ready-to-bill queue
- Front Desk active service chat section (newer workflow direction)
- Order-level message threads intended to replace radios
- Finalize flow with customer completion-email draft behavior
- Fuel meter start/end capture during completion flow
- Fuel-type visual differentiation (JET-A vs 100LL styling)

## Important Current Truths
- Shared mode is active when `DATABASE_URL` exists.
- Browser session state can still make auth failures look like backend failures.
- Kiosk create path was repaired on 2026-04-24 to allow consistent kiosk source handling and automatic ID generation.
- Dummy traffic was successfully seeded after the kiosk create-path repair.
- Active service coordination is now being treated as a first-class workflow, not a side note on the ready-to-bill card.

## Current Workflow Direction
GroundCore is moving toward two distinct front-desk surfaces:
1. **Active Service Chat**
   - always-open
   - grouped by tail number
   - live ramp ↔ desk coordination
   - intended to replace radios
2. **Ready to Bill**
   - finalized handoff context
   - fuel summary
   - finalize / email / billing actions

## Known Weak Points / Tech Debt
- `index.html` remains large and still mixes runtime wiring with extracted component loading.
- Extracted component cache-busting matters; stale browser JS caused repeated confusion during recent fixes.
- Message identity formatting still needs improvement so chat reads like real ops traffic (name + tail number), not just generic roles.
- Repo docs were stale and needed manual refresh.
- Some significant changes may still be uncommitted.

## Next Recommended Steps
1. Improve service-chat message labeling (person name + tail number)
2. Commit current local fixes before more testing piles on
3. Keep hammering ramp ↔ desk workflow with real pilot-like scenarios
4. Continue hardening shared auth/session clarity
5. Prepare for Render + Supabase deployment once local/shared workflow feels trustworthy

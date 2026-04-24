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
- Service chat now renders with stronger aircraft context (tail number fallback + sender name persistence).
- Front Desk Active Service Chat is now restricted to true `in_progress` aircraft rather than all ramp-active statuses.
- Fuel prices are temporarily surfaced as a compact info strip under the page header on Ramp and Front Desk.

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
- Message identity formatting is improved, but read-state semantics and concurrency behavior still need more hard testing.
- Repo docs were stale and needed manual refresh.
- Fuel prices are currently hardcoded and should eventually move to admin/config.

## Next Recommended Steps
1. Continue hardening ramp ↔ desk workflow with real pilot-like scenarios
2. Clean up status semantics so legacy labels stop leaking through (`ready`, `finalized`, `in-progress` vs canonical values)
3. Tighten handoff / finalize clarity on Front Desk
4. Hard-test read-state and concurrency edge cases
5. Move fuel prices into config/admin once the workflow stabilizes

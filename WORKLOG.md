# GroundCore Worklog

## Purpose
Session-to-session checkpoint. Read this first to regain context fast.

---

## Current Phase
Pre-pilot workflow hardening and shared-mode stabilization (updated 2026-04-24)

## Current Status
GroundCore is actively being hardened around real ops workflow:
- shared-mode auth/session behavior
- kiosk create path
- ramp → front desk service handoff
- fuel meter capture
- front desk finalize/billing flow
- live service chat intended to replace radios

Local server:
- http://localhost:8792

## What Was Done (2026-04-24)
### Confirmed existing but uncommitted work
- Verified yesterday's UI work for fuel colors and meter capture existed in local code but was not committed yet.
- Files involved included:
  - `src/ui/ops/components/CompletionModal.js`
  - `src/ui/ops/components/OrderCard.js`
  - `src/ui/ops/components/ServicePanel.js`
  - `server/db/schema.js`
  - `server/db/repositories.js`

### Fuel / departure / finalize fixes
- Fixed departure rendering that was showing `Invalid Date` by tolerating full timestamp/ISO values.
- Fixed desk-side fuel totals to use the real data fields in priority order:
  - `fuelActualGallons`
  - `fuelRequestedGallons`
  - `fuelQuantity`
- Improved Finalize Billing Review departure display to be human-readable instead of raw ISO values.
- Removed `Purpose` from Finalize Billing Review (deemed redundant by Steve).
- Changed finalization to auto-draft a completion email using actual service details.
- Adjusted dashboard gallon totals so finalized orders still count instead of dropping off immediately.

### Kiosk create-path repair
Found an inconsistent source-validation bug:
- `/checkin/customers` accepted `source: kiosk`
- `/checkin/orders` rejected that and expected `kiosk-checkin`

Fixes applied:
- kiosk endpoints now accept consistent kiosk source shape
- kiosk endpoints auto-generate IDs when missing
- kiosk orders default to `pending`

After repair, seeded dummy kiosk traffic successfully:
- N728GC — Citation CJ3 — JET-A 165
- N415TX — King Air 350 — JET-A 92
- N602LM — Cirrus SR22 — 100LL 38
- N990WB — Pilatus PC-12 — JET-A 124

### Messaging / service chat overhaul
- Repaired order-thread callback argument bugs that were causing broken requests like:
  - `POST /orders/RAMP/messages`
- Added cache-busting version bumps for extracted component files when stale browser JS was blocking fixes from appearing.
- Added a dedicated **Active Service Chat** section to Front Desk above Ready to Bill.
- Goal is explicit: replace two-way radios with structured service chat by aircraft/tail.
- Desk-side service chat is intended to be always visible for active service aircraft, independent of the ready-to-bill card.

### Chat scroll battle
This was the major rabbit hole of the session.

Symptoms:
- sending a message snapped the entire page downward on both ramp and desk
- after stopping that, the thread still did not reliably show the newest message
- switching between ramp and desk also failed to land at the latest message

Attempted fixes included:
- removing page-level `scrollIntoView()` behavior
- moving to internal pane scroll only
- disabling auto-scroll
- delayed scroll after paint
- `block: 'nearest'` end-marker scroll
- `useLayoutEffect`
- textarea blur after send
- reducing mark-read rerender churn
- fixed-height internal scroll region
- remount-per-thread/message-count behavior

By the end of the session, Steve reported the thread behavior finally looked fixed enough to continue.

## Product decisions clarified on 2026-04-24
- Front Desk needs an always-open **service chat** section for active service aircraft.
- This service chat is distinct from the ready-to-bill/completed aircraft card.
- It should be grouped by tail number and support inline reply.
- Eventually chat lines should read more like:
  - `Neil, N605BM — [message]`
  rather than only generic role labels.
- This chat is explicitly meant to replace radios.

## Additional hardening pass (later on 2026-04-24)
- Fixed Front Desk active chat render bug caused by an undefined `orderMessages` reference in `OfficeView`.
- Simplified thread-message callback contracts so ramp/desk message sends resolve to the correct order more reliably.
- Extended message persistence to store and return `senderName` and `tailNumber` in both local and Postgres-backed modes.
- Fixed thread bubble labels so aircraft tail fallback resolves correctly from live thread context, customer/order context, and thread title.
- Cleaned up service labels from raw internal values like `lav` and `crew_car` to presentation labels like `Lavatory` and `Crew Car`.
- Strengthened service-chip styling so requested services read like real operational commitments instead of background metadata.
- Removed the now-redundant Front Desk `Unread Service Chats` top stat as the primary signal and shifted unread attention to the per-aircraft active service cards.
- Tightened Front Desk `Active Service Chat` to show only aircraft actually in service (`in_progress`).
- Added fuel prices as a compact header strip on Ramp and Front Desk:
  - Jet-A: $7.09/gal
  - 100LL: $6.45/gal

## Pilot-prep verification snapshot (2026-04-24)
### Verified in code/data
- Kiosk notes now flow into `order.notes`.
- Ramp queue explicitly sorts by earliest departure first, then creation time.
- Front Desk active-service filtering now restricts to true `in_progress` aircraft.
- Service chat persistence supports `senderName` and `tailNumber`.

### Still needs live human validation
- Full kiosk submit flow.
- Notes visibly surfacing after kiosk submission.
- Refresh behavior through chat/handoff/finalize.
- Same-aircraft concurrency behavior.
- Ramp card scanability in live use.

### Known issue
- General chat horse notification remains inconsistent because browser audio permission is still blocking some playback attempts.

## Known Risks / Follow-up
- Shared-mode auth/session behavior can still be confusing when browser state is stale.
- Repo documentation is still partly catch-up documentation, not yet a fully trusted source of truth.
- Status semantics still leak some legacy labels (`ready`, `finalized`, `in-progress`) even though canonical workflow is clearer now.
- Read-state and concurrency behavior still need deliberate hard testing.
- Fuel prices are currently hardcoded and should move into config/admin later.

## If Starting Fresh Next Session
1. Read this WORKLOG
2. Read CURRENT_STATE.md
3. Inspect `git status` first — many important changes may still be uncommitted
4. Start server: `cd ~/Work/GroundCore && bash scripts/local-server.sh restart`
5. Verify:
   - ramp ↔ desk service chat labels and persistence
   - Front Desk active-service filtering (`in_progress` only)
   - service label presentation
   - fuel price strip placement
   - finalize + draft email
   - front desk gallon totals

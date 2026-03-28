# GroundCore Worklog

## Purpose
Session-to-session checkpoint. Read this first to regain context fast.

---

## Current Phase
Pre-pilot testing with Tacie (2026-03-28)

## Current Status
Ready for Tacie test session. Server running at http://localhost:8792 on all interfaces (HOST=0.0.0.0). Tacie can hit it at http://192.168.1.101:8792.

## What Was Done (2026-03-28)
- Fixed null orderId bug in general chat messages (was throwing requireField error → all general chat was broken)
- Updated TODO.md and CURRENT_STATE.md to reflect actual post-sprint state
- Cleaned local-store.json to fresh/empty state (no junk test data) for Tacie test
- Removed forced password change on tacie/ramp accounts so onboarding is smooth
- Backed up pre-test store to local-store.pre-tacie-test.json
- Confirmed kiosk → ramp flow is clean end-to-end (status constants correct, activeRamp selector correct)
- Confirmed horse whinny works on LAN (tested with Tacie directly)
- Server started on 0.0.0.0:8792 for LAN access

## What Was Done (2026-03-26 to 2026-03-27)
- Horse whinny notification sound (Dragon Studio MP3, wired to incoming messages)
- Fuel quantity decimals preserved on completion
- Tail-first returning aircraft check-in on kiosk
- Start Service snap-back fixed (order transition + in-progress gate, await handoff)
- Thread reads working locally
- Local order updates working
- Auth hardened, local-only backend access
- Ramp view repaired, scroll fixed, queue counts aligned
- Front desk filters scoped to ready queue, fuel totals rounded
- Ramp handoff banner aligned with today count
- Export/import buttons removed from top bar
- New Customer button replaced with QR placeholder
- Focused ramp service panel workflow
- Polish pass: labels, copy, check-in flow

## Current Pilot Accounts
| Username | Password             | Role   |
|----------|----------------------|--------|
| steve    | Airboss-Steve-Prod-2!| ADMIN  |
| tacie    | groundcore-tacie     | OFFICE |
| ramp     | groundcore-ramp      | RAMP   |
| lindsey  | mustang1             | OFFICE |
| neil     | groundcore-ramp      | RAMP   |
| kiosk    | groundcore-kiosk     | KIOSK  |

## Important Current Truths
- Running off local Node server + file store (no Postgres, no Render)
- Server binds to 0.0.0.0 when started with HOST=0.0.0.0 for LAN testing
- LAN URL for Tacie: http://192.168.1.101:8792 (kiosk: /kiosk)
- Store is clean/empty — all data from Tacie's test will be real

## Next Recommended Steps
1. Tacie test session — let her break it, document friction
2. After test: note bugs/friction found, fix priorities
3. Render + Supabase deployment (so pilot isn't running off Steve's laptop)
4. Real pilot: Lindsey, Neil, John

## Blockers / Risks
- Whole pilot depends on Steve's MacBook being on — not sustainable
- No git on ~/Work/GroundCore (WAIT — it IS under git now, confirmed)
- Audio unlock on mobile may still be an issue (Tacie heard it today in general chat, but order thread notifications untested on mobile)

## If Starting Fresh Next Session
1. Read this WORKLOG
2. Read CURRENT_STATE.md
3. Read TODO.md
4. Start server: cd ~/Work/GroundCore && HOST=0.0.0.0 npm run dev

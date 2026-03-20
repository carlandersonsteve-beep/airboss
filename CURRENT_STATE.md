# Current State

## Existing Files
- `index.html` — main Smart Arrival / AirBoss operations interface
- `kiosk.html` — customer check-in kiosk
- `src/` — new refactor scaffold for core/data/domain layers
- `WORKLOG.md` — running checkpoint for session continuity

## Known Current Capabilities
- customer management
- service orders
- tickets
- ramp/front desk views
- internal chat
- local storage persistence
- some Google Sheets / Google Forms sync behavior

## Refactor Progress
- Project is now under git in `~/Work/Airboss`
- Baseline and post-baseline checkpoint commits exist
- Domain map and refactor structure docs are in place
- Core constants/workflow/storage layers exist under `src/`
- Repository and first-pass service layers exist under `src/`
- `index.html` now has a compatibility bridge for legacy + canonical order statuses
- `index.html` now also has centralized selector-style helpers for:
  - today orders
  - active ramp orders
  - ready-for-front-desk orders
  - closed orders
  - week orders
  - fuel totals

## Likely Weak Points
- single-file HTML structure still drives the live app
- in-browser Babel/React setup
- localStorage is still the primary live store
- Google sync/backup logic is still embedded in the old app flow
- new architecture exists, but most behavior is not yet routed through it

## Immediate Next Focus
- start routing order transitions through service-style functions instead of direct inline mutation
- start routing customer/ticket/message writes through service/repository layers
- move sync behavior behind the new sync layer
- preserve current workflow while reducing architectural risk

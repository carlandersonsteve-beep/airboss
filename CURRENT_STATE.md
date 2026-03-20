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
- Baseline and multiple checkpoint commits exist
- Domain map and refactor structure docs are in place
- Core constants/workflow/storage layers exist under `src/`
- Repository and first-pass service layers exist under `src/`
- `index.html` has a compatibility bridge for legacy + canonical order statuses
- `index.html` has centralized selector-style helpers for order filtering/counting
- `index.html` has service-style transition helpers for core order actions
- `index.html` now also has centralized record-creation/write helpers for:
  - messages
  - customers
  - tickets

## Likely Weak Points
- single-file HTML structure still drives the live app
- in-browser Babel/React setup
- localStorage is still the primary live store
- Google sync/backup logic is still embedded in the old app flow
- new architecture exists, but most behavior is not yet routed through `src/`
- message/customer/ticket writes are cleaner now, but not yet delegated to imported service modules

## Immediate Next Focus
- reduce direct localStorage usage in `index.html`
- move Google sync behavior behind the new sync layer
- continue replacing inline mutation logic with service/repository-backed flows
- begin deciding when to switch from in-file bridge helpers to `src/` module usage

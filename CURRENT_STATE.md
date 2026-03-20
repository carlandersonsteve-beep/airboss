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
- `index.html` now has service-style transition helpers for core order actions:
  - create order record
  - transition order
  - start order service
  - mark order ready for front desk
  - close order
  - recall order uses centralized transition handling

## Likely Weak Points
- single-file HTML structure still drives the live app
- in-browser Babel/React setup
- localStorage is still the primary live store
- Google sync/backup logic is still embedded in the old app flow
- new architecture exists, but most behavior is not yet routed through `src/`
- customer/ticket/message writes still mostly use old inline patterns

## Immediate Next Focus
- route customer/ticket/message writes through service/repository layers
- reduce direct localStorage usage in `index.html`
- move Google sync behavior behind the new sync layer
- continue preserving current workflow while reducing architectural risk

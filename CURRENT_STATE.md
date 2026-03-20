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
- Baseline commit created before deeper wiring work
- Domain map and refactor structure docs are in place
- Core constants/workflow/storage layers exist under `src/`
- Repository and first-pass service layers exist under `src/`
- `index.html` has started a compatibility pass so status logic can understand both:
  - legacy statuses (`pending`, `in-progress`, `ready`, `finalized`)
  - canonical refactor statuses (`pending`, `in_progress`, `ready_for_front_desk`, `closed`)

## Likely Weak Points
- single-file HTML structure still drives the live app
- in-browser Babel/React setup
- localStorage is still the primary live store
- Google sync/backup logic is still embedded in the old app flow
- new architecture exists, but most behavior is not yet routed through it

## Immediate Next Focus
- continue wiring `index.html` to use the new spine
- replace direct mutation/filtering logic with selectors/services incrementally
- move sync behavior behind the new sync layer
- preserve current workflow while reducing architectural risk

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
- `index.html` has centralized record-creation/write helpers for messages/customers/tickets
- `index.html` has reduced some direct localStorage leakage by centralizing:
  - pre-departure sent updates
  - export snapshot building
  - import restoration for messages as well as core records
  - order patch persistence helper usage

## Likely Weak Points
- single-file HTML structure still drives the live app
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- Google sync/backup logic is still embedded in the old app flow
- new architecture exists, but most behavior is not yet routed through `src/`
- sync boundaries still need cleanup even though storage boundaries are improving

## Immediate Next Focus
- move Google sync/backup behavior behind explicit sync helpers
- continue reducing direct storage/sync side effects in `index.html`
- begin bridging selected live behaviors to actual `src/` service/repository modules
- preserve local-first testing while improving code reliability

# Current State

## Existing Files
- `index.html` — main Smart Arrival / AirBoss operations interface
- `kiosk.html` — customer check-in kiosk
- `src/` — new refactor scaffold for core/data/domain layers
- `src/app/browserRuntime.js` — browser-safe runtime bridge used by the live local app
- `src/ui/ops/components/*` — active UI extraction targets/components
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
- Live ops app and kiosk now bridge behavioral logic through `src/app/browserRuntime.js`
- Kiosk creation flow is now runtime-backed instead of fully ad hoc
- UI extraction phase is active:
  - `OrderCard` is now a live externalized component
  - `RampView.reference.js` created from live code
  - `RampView.js` created as extracted live component file
  - `index.html` now aliases `RampView` to `window.AirBossComponents.RampView`
  - dependency bag expanded through `window.AirBossDeps`

## Likely Weak Points
- single-file HTML structure still drives some major live UI behavior
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- extracted UI is live for `OrderCard` and `RampView`, but broader UI remains inline
- browser globals/dependency bag are a transitional mechanism, not the final UI module system

## Immediate Next Focus
- verify/stabilize the live `RampView` extraction path
- then extract `OfficeView`
- keep local-first testing stable while shrinking the HTML files
- preserve current workflow while improving maintainability

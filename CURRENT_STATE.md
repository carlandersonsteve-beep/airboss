# Current State

## Existing Files
- `index.html` — main Smart Arrival / AirBoss operations interface
- `kiosk.html` — customer check-in kiosk
- `src/` — new refactor scaffold for core/data/domain layers
- `src/app/browserRuntime.js` — browser-safe runtime bridge used by the live local app
- `src/ui/ops/components/*` — first UI extraction targets/scaffolds
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
- UI extraction phase has begun:
  - `OrderCard.reference.js` created from live code
  - `OrderCard.js` scaffold was upgraded into a live external component file
  - `index.html` now aliases `OrderCard` to `window.AirBossComponents.OrderCard`
  - dependency bag exposed through `window.AirBossDeps`

## Likely Weak Points
- single-file HTML structure still drives most live UI behavior
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- extracted UI is now live for `OrderCard`, but broader UI remains inline
- browser globals/dependency bag are a transitional mechanism, not the final UI module system

## Immediate Next Focus
- verify/stabilize the live `OrderCard` extraction path
- then extract `RampView`
- keep local-first testing stable while shrinking the HTML files
- preserve current workflow while improving maintainability

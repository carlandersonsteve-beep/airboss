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
  - `OrderCard.js` scaffolded as extraction target
  - prop contract and extraction plan docs created

## Likely Weak Points
- single-file HTML structure still drives both live UIs
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- browser runtime is a bridge, not the final build/deploy model
- extracted UI files are scaffold/reference stage, not yet wired into the live app

## Immediate Next Focus
- convert `OrderCard` from reference/scaffold into a live-wired extracted component
- then extract `RampView`
- keep local-first testing stable while shrinking the HTML files
- preserve current workflow while improving maintainability

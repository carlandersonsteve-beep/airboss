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
- Major ops UI extraction is live:
  - `OrderCard`
  - `RampView`
  - `OfficeView`
- Stabilization pass has begun:
  - explicit extracted-component resolver added
  - missing extracted component load now fails loudly instead of silently
  - stabilization notes added for the extracted ops surface

## Likely Weak Points
- single-file HTML structure still drives some remaining live UI behavior
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- extracted UI now covers the major ops surfaces, but modals/views remain inline
- browser globals/dependency bag are still transitional, not the final UI module system

## Immediate Next Focus
- continue stabilizing the extracted ops surface
- reduce remaining dependency-bag fragility
- then choose the first real review/opening checkpoint
- preserve current workflow while improving maintainability

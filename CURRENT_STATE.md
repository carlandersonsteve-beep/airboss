# Current State

## Existing Files
- `index.html` — main Smart Arrival / AirBoss operations interface
- `kiosk.html` — customer check-in kiosk
- `src/` — new refactor scaffold for core/data/domain layers
- `src/app/browserRuntime.js` — browser-safe runtime bridge used by the live local app
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
- `index.html` has reduced some direct localStorage leakage
- `index.html` has centralized sync adapters for Google Sheets / Forms backup
- Live app now loads `src/app/browserRuntime.js`
- Live app selector logic now bridges through the browser runtime
- Live app order service actions now bridge through the browser runtime
- Live app customer/ticket/message payload logic now also bridges through the browser runtime

## Likely Weak Points
- single-file HTML structure still drives the live app UI
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- browser runtime is a bridge, not the final build/deploy model
- kiosk is not yet bridged through the browser runtime
- many live behaviors still have not been routed directly through imported `src/` modules because there is still no build system

## Immediate Next Focus
- decide whether to bridge kiosk behavior next or start extracting major UI chunks from `index.html`
- continue shrinking `index.html` responsibility without breaking local-first testing
- preserve local-first testing while improving reliability and maintainability
- keep using runtime bridging as the path toward eventual modularization

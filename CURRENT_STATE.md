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
- Live ops app now loads `src/app/browserRuntime.js`
- Live ops app selector logic, order logic, and customer/ticket/message payload logic bridge through the browser runtime
- `kiosk.html` now also loads `src/app/browserRuntime.js`
- Kiosk customer/order creation now uses runtime-backed payload builders instead of ad hoc shape creation
- Kiosk backup behavior is now centralized behind a sync adapter helper

## Likely Weak Points
- single-file HTML structure still drives both live UIs
- in-browser Babel/React setup
- localStorage is still the primary live store by design for this phase
- browser runtime is a bridge, not the final build/deploy model
- UI files are still too large even though behavioral logic is cleaner
- some kiosk/ops schema duplication remains for compatibility fields like `aircraft` vs `aircraftType`

## Immediate Next Focus
- decide whether to begin extracting major UI chunks from `index.html` / `kiosk.html`
- continue shrinking HTML-file responsibility without breaking local-first testing
- preserve local-first testing while improving reliability and maintainability
- keep runtime bridging as the path toward eventual modularization

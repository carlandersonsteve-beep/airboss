# AirBoss Worklog

Use this file as the session-to-session checkpoint.

## Purpose
At the end of each work session, update:
- what was completed
- what is currently true
- what should happen next
- any blockers or important decisions

This should be the fastest way to regain context at the next startup.

---

## Current Phase
Phase 1A — Structure-first refactor scaffold and initial wiring

## Current Status
In progress.

## Completed
- Read and assessed the current AirBoss app (`index.html`, `kiosk.html`)
- Mapped current entities, workflow, and domain boundaries
- Created `DOMAIN_MAP.md`
- Created `REFACTOR_STRUCTURE.md`
- Created initial refactor folder scaffold under `src/`
- Added first-pass core modules:
  - `src/core/constants.js`
  - `src/core/workflow.js`
  - `src/data/storage.js`
- Added first-pass repositories:
  - `customerRepository.js`
  - `orderRepository.js`
  - `ticketRepository.js`
  - `messageRepository.js`
- Added first-pass domain/service layers:
  - `src/domain/orders/orderService.js`
  - `src/domain/orders/orderSelectors.js`
  - `src/domain/customers/customerService.js`
  - `src/domain/tickets/ticketService.js`
  - `src/domain/messages/messageService.js`
- Added first-pass sync layer placeholders:
  - `src/data/sync/sheetsSync.js`
  - `src/data/sync/formsBackup.js`
  - `src/data/sync/exportImport.js`
- Added versioning and rollback planning doc:
  - `VERSIONING_AND_RECOVERY.md`
- Added session continuity checkpoint file:
  - `WORKLOG.md`
- Initialized git in `~/Work/Airboss`
- Added `.gitignore`
- Created baseline commit:
  - `66138bf` — `airboss: baseline before refactor wiring`
- Updated `CURRENT_STATE.md` to reflect the new architecture/recovery status
- Began safe wiring in `index.html` by adding compatibility helpers for canonical + legacy order statuses
- Replaced several direct status checks in the UI with compatibility helpers so the app can tolerate both legacy and canonical status values during refactor
- Added centralized selector-style helpers directly inside `index.html` as an intermediate bridge for:
  - today orders
  - active ramp orders
  - ready-for-front-desk orders
  - closed orders
  - week orders
  - fuel totals
- Replaced more duplicated inline filtering/counting logic in `index.html` with those centralized helper functions
- Added service-style order transition helpers directly inside `index.html` as an intermediate bridge for:
  - create order record
  - transition order
  - start order service
  - mark order ready for front desk
  - close order
- Routed the most contained order actions through these helper functions:
  - ramp start service
  - fuel verification start
  - ramp complete/no-fuel complete
  - front desk finalize/close
  - recall continues through centralized transition handling
- Added centralized record-creation/write helpers directly inside `index.html` for:
  - messages
  - customers
  - tickets
- Replaced more ad hoc `setState([...existing, newRecord])` style mutation paths with helper-backed functional updates
- Reduced some direct storage leakage in `index.html` by:
  - removing a direct order storage rewrite inside completion flow
  - replacing direct localStorage pre-departure flag updates with a centralized order patch helper
  - centralizing export snapshot creation
  - extending import to restore messages as part of app state
  - switching more state writes to functional update patterns
- Centralized Google sync/backup behavior inside `index.html` behind `syncAdapters` as an intermediate bridge for:
  - Google Sheets sync calls
  - Google Forms JSON payload backup calls
- Replaced direct sync call sites to use these adapters instead of embedding raw fetch behavior in multiple places
- Added `src/app/browserRuntime.js` as a browser-safe runtime bridge for local-first use without a build system
- Routed live order selector behavior through `window.AirBossRuntime.orderSelectors`
- Routed live order service behavior through `window.AirBossRuntime.orderService`
- Made `index.html` load the browser runtime bridge before the Babel app script
- Expanded browser runtime bridging so the live ops app now also uses runtime-backed customer/ticket/message payload logic
- Updated `kiosk.html` to load `src/app/browserRuntime.js`
- Replaced kiosk ad hoc customer/order payload creation with runtime-backed payload builders
- Centralized kiosk backup behavior behind a local sync adapter helper
- Reduced kiosk schema drift risk by aligning kiosk-created customer/order records more closely with the ops-side runtime model
- Began UI extraction phase:
  - created `src/ui/ops/components/OrderCard.reference.js` from live code
  - scaffolded and then upgraded `src/ui/ops/components/OrderCard.js` into a live external component file
  - documented `OrderCard` prop contract
  - documented UI extraction plan/order
  - updated `index.html` to alias `OrderCard` to the extracted component via `window.AirBossComponents.OrderCard`
  - exposed required live dependencies through `window.AirBossDeps`
- Continued UI extraction phase:
  - created `src/ui/ops/components/RampView.reference.js` from live code
  - created `src/ui/ops/components/RampView.js` as a live external component file
  - documented `RampView` prop contract/notes
  - updated `index.html` to alias `RampView` to the extracted component via `window.AirBossComponents.RampView`
  - expanded `window.AirBossDeps` so the extracted `RampView` can use shared selectors and `OrderCard`
- Continued UI extraction phase again:
  - created `src/ui/ops/components/OfficeView.reference.js` from live code
  - created `src/ui/ops/components/OfficeView.js` as a live external component file
  - documented `OfficeView` prop contract/notes
  - updated `index.html` to alias `OfficeView` to the extracted component via `window.AirBossComponents.OfficeView`
  - expanded `window.AirBossDeps` so the extracted `OfficeView` can use shared status/selector helpers
- Began stabilization pass for extracted ops surface:
  - added `src/ui/ops/components/STABILIZATION_NOTES.md`
  - added explicit extracted-component resolver in `index.html`
  - replaced direct component global access with guarded resolution for `OrderCard`, `RampView`, and `OfficeView`
- Continued stabilization pass:
  - added `src/ui/ops/components/componentBridge.js`
  - extracted components now validate required dependencies explicitly via `window.AirBossComponentBridge.requireDeps(...)`
  - loading order updated so the bridge helper exists before extracted Babel components run
- Continued stabilization again:
  - extracted `OrderMessageThread` into `src/ui/ops/components/OrderMessageThread.js`
  - extracted `CompletionModal` into `src/ui/ops/components/CompletionModal.js`
  - replaced inline versions in `index.html` with extracted-component aliases
  - reduced hidden coupling between extracted ops components and the remaining inline monolith
- Continued top-level stabilization:
  - normalized all extracted ops component resolution through `getExtractedComponent(...)`
  - replaced raw `window.AirBossDeps = {...}` assignment with `publishAirBossDeps()` helper
  - documented top-level stabilization notes
- Small follow-up stabilization:
  - fixed `RampView` to also resolve through guarded extraction instead of raw global access
  - added `REVIEW_READINESS.md`
  - clarified that further stabilization should now stay very small and targeted
- Bug fix from first live opening:
  - restored missing `getExtractedComponent(...)` helper in `index.html`
  - this likely caused the blank-screen failure in the ops app while kiosk still rendered
- Branding change requested by Steve:
  - rename visible product/app branding from `Smart Arrival` to `AirBoss`
- Began Mustang-first ops messaging cleanup:
  - replaced fake `OrderMessageThread` note-box semantics with persisted per-order thread UI
  - kept front-desk handoff notes separate inside completion flow
  - demoted general chat to a secondary ops channel instead of the main communication path
  - removed manual sender selection from general chat UI
  - improved front desk visibility into order-level message previews/threads
  - added local-first unread tracking for order threads by role (`RAMP` / `OFFICE`)
  - added quick ramp alert actions for common exceptions (customer waiting, crew car, need desk help)
- Began shared backend scaffold work:
  - added `package.json` for project-level backend scripts
  - added built-in Node HTTP backend scaffold under `server/`
  - added initial shared API shape for bootstrap/orders/order-messages/alerts/thread-reads
  - added Postgres schema draft for customers, orders, order_messages, alerts, and thread_reads
  - kept backend intentionally thin and dependency-light for first implementation pass
- Continued backend work from scaffold to real persistence wiring:
  - added `pg` dependency
  - added Postgres connection layer under `server/db/client.js`
  - added repository-backed reads/writes for customers, orders, messages, alerts, and thread read state
  - changed `/bootstrap` and data endpoints from stub responses to Postgres-backed behavior
  - made missing `DATABASE_URL` fail clearly instead of faking persistence
- Continued frontend/shared-state cutover:
  - wired main ops app bootstrap + polling to the shared backend
  - wired order threads, alerts, thread reads, and order transitions to backend persistence paths
  - wired kiosk check-in to create customers/orders through backend with local fallback retained
- Began deployment/installability + access-control layer:
  - added PWA manifest, icons, and service worker shell caching
  - added install metadata to ops and kiosk pages
  - added simple backend login endpoint against `app_users`
  - added basic session-based role gating in the ops app (Ramp / Office / Admin)
  - added seed user SQL for Mustang v1 pilot credentials
  - updated the Node backend to serve static app files directly (`/`, `/kiosk`, manifest, service worker, assets)
  - documented the single-app deployment shape for Mustang v1
- Refined pilot UX for tomorrow's testing:
  - changed seeded users to cleaner human-facing Mustang test accounts (`steve`, `tacie`, `ramp`, `kiosk`)
  - updated the login card to show the pilot credentials directly
  - changed kiosk-role login behavior to redirect straight to `/kiosk`

## Important Current Truths
- Live project files currently appear to be in `~/Work/Airboss`
- AirBoss is now a git repo with checkpoint commits
- AirBoss is still running as single-file apps (`index.html` and `kiosk.html`)
- New scaffold files exist, but are only partially wired into the app
- Canonical order statuses for the refactor are now defined as:
  - `pending`
  - `in_progress`
  - `ready_for_front_desk`
  - `closed`
- Legacy statuses are now partially normalized in `index.html` through compatibility helpers
- Selector logic is now bridging through the browser runtime layer
- Core order transitions are now bridging through the browser runtime layer
- Customer/ticket/message payload logic is now also bridging through the browser runtime layer
- Kiosk creation logic is now also bridging through the browser runtime layer
- `OrderCard`, `RampView`, `OfficeView`, `OrderMessageThread`, and `CompletionModal` are now live-wired extracted components
- Stabilization is now focused on reducing bridge fragility before the first meaningful review/opening
- Local-first remains the correct mode for this phase; cleanup is about architecture, not infrastructure expansion

## Next Recommended Steps
1. Re-test the ops app after restoring `getExtractedComponent(...)`
2. If it loads, begin the first meaningful review/opening
3. If not, inspect the next console/runtime failure and fix surgically
4. Keep local-first testing as the runtime model while cleaning internal boundaries
5. Make a checkpoint commit after each meaningful wiring milestone

## Blockers / Risks
- There may be duplicate/mirrored project files elsewhere, so canonical location should stay confirmed before heavy edits
- New files are scaffold-level and only partly integrated into live behavior
- Compatibility mode is useful now, but should not become permanent architectural debt
- Intermediate in-file helpers and browser runtime bridges are transitional, not the final end state
- There is still no build system, so module reuse is constrained by browser loading realities
- Browser global dependency wiring (`window.AirBossDeps`) is transitional and should not become permanent architecture
- UI files remain large enough to hide workflow bugs even though data logic is getting cleaner

## Decision Log
- Do not rewrite from scratch
- Do not move to a backend first
- Refactor in place around the existing workflow
- Build a clean local-first architecture spine before major feature work
- Add explicit versioning/recovery planning before deeper wiring work
- Put the project under git before making larger behavioral changes
- Use a compatibility pass to bridge legacy and canonical status models during transition
- Use in-file selector helpers as an intermediate bridge before fully routing views to `src/domain/orders/orderSelectors.js`
- Use in-file transition helpers as an intermediate bridge before fully routing views to `src/domain/orders/orderService.js`
- Use in-file record helpers as an intermediate bridge before fully routing writes through customer/ticket/message services
- Keep AirBoss local-first for testing until workflow quality is proven
- Use in-file sync adapters as an intermediate bridge before fully routing sync behavior through `src/data/sync/*`
- Use a browser runtime bridge to start consuming `src/` architecture concepts without adding a build system yet
- Keep kiosk and ops aligned so kiosk does not become the schema-drift side door into the system
- Start UI extraction with `OrderCard`, then `RampView`, then `OfficeView`
- Use browser globals as a temporary extraction bridge only where needed to safely externalize live UI code
- Before first serious review, prefer stabilization over more aggressive refactors

## If Starting Fresh Next Session
Read in this order:
1. `README.md`
2. `PROJECT_CONTEXT.md`
3. `CURRENT_STATE.md`
4. `TODO.md`
5. `ARCHITECTURE_NOTES.md`
6. `WORKLOG.md`
7. `DOMAIN_MAP.md`
8. `REFACTOR_STRUCTURE.md`
9. `VERSIONING_AND_RECOVERY.md`

Then continue with the next recommended step unless priorities changed.

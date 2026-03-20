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
- Selector logic is beginning to move out of repeated inline expressions
- Core order transitions are beginning to move out of ad hoc inline handlers
- Most storage, sync, and communication behavior is still embedded in the old app flow and needs to be migrated incrementally

## Next Recommended Steps
1. Route customer/ticket/message writes through service/repository layers
2. Reduce direct localStorage usage in `index.html`
3. Move Google sync and backup logic behind the new sync layer wrappers
4. Continue replacing ad hoc mutation logic with centralized helper/service flows
5. Once behavior is routed through the new spine, split more UI components out of the single-file HTML
6. Make a checkpoint commit after each meaningful wiring milestone

## Blockers / Risks
- There may be duplicate/mirrored project files elsewhere, so canonical location should stay confirmed before heavy edits
- Existing UI still contains direct browser storage calls
- Existing UI still contains embedded sync logic
- New files are scaffold-level and only partly integrated into live behavior
- Compatibility mode is useful now, but should not become permanent architectural debt
- Intermediate in-file service helpers are a bridge, not the desired end state

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

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
Phase 1A — Structure-first refactor scaffold

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
- Added first-pass order domain service:
  - `src/domain/orders/orderService.js`
- Added first-pass order selector layer:
  - `src/domain/orders/orderSelectors.js`
- Added first-pass service layers:
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

## Important Current Truths
- Live project files currently appear to be in `~/Work/Airboss`
- The workspace mirror path was not the active code location during this scan
- AirBoss is still running as single-file apps (`index.html` and `kiosk.html`)
- New scaffold files exist, but are not yet wired into the app
- Canonical order statuses for the refactor are now defined as:
  - `pending`
  - `in_progress`
  - `ready_for_front_desk`
  - `closed`
- Legacy statuses are being normalized through mapping, not yet replaced in UI
- Recovery/versioning planning now exists, but git is still not initialized in this project

## Next Recommended Steps
1. Replace direct filtering/status logic in `index.html` with `orderSelectors` where practical
2. Replace direct order mutation paths with `orderService` calls
3. Replace direct customer/ticket/message mutation paths with service/repository calls
4. Move Google sync and backup logic behind the new sync layer
5. Once the app is using the new spine, split UI components more aggressively out of single-file HTML

## Blockers / Risks
- `~/Work/Airboss` is not currently a git repository
- There may be duplicate/mirrored project files elsewhere, so canonical location should be confirmed before heavy edits
- Existing UI still uses legacy status strings and direct browser storage calls
- New files are scaffold-level and not yet integrated into live behavior

## Decision Log
- Do not rewrite from scratch
- Do not move to a backend first
- Refactor in place around the existing workflow
- Build a clean local-first architecture spine before major feature work
- Add explicit versioning/recovery planning before deeper wiring work

## If Starting Fresh Next Session
Read in this order:
1. `README.md`
2. `PROJECT_CONTEXT.md`
3. `CURRENT_STATE.md` (if maintained)
4. `TODO.md`
5. `ARCHITECTURE_NOTES.md`
6. `WORKLOG.md`
7. `DOMAIN_MAP.md`
8. `REFACTOR_STRUCTURE.md`
9. `VERSIONING_AND_RECOVERY.md`

Then continue with the next recommended step unless priorities changed.

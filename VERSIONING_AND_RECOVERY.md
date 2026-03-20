# AirBoss Versioning and Recovery

## Why this exists
AirBoss is entering a refactor phase. That means structure will improve, but risk also goes up.

If something gets weird, we need a simple way to answer:
- what changed?
- when did it change?
- what version were we on?
- how do we roll back?

---

## Immediate Recommendation
Use **three layers of protection**:

### 1. Git version control
Best option for code history.

Use git for:
- code changes
- docs changes
- architecture notes
- worklog updates

Suggested commit style:
- `airboss: add phase 1a constants and repositories`
- `airboss: extract order workflow logic`
- `airboss: wire order service into ramp flow`

### 2. Snapshot backups
Use exportable app data snapshots during refactor.

Protects against:
- broken localStorage migrations
- bad normalization logic
- accidental data shape drift

Suggested snapshot naming:
- `airboss-data-backup-YYYY-MM-DD.json`
- `airboss-pre-refactor-step-02.json`

### 3. Worklog checkpointing
Use `WORKLOG.md` to record:
- what was changed
- whether it was only scaffold or actually wired in
- what should be tested next
- whether rollback may be needed

---

## What to Version

### Must version
- `index.html`
- `kiosk.html`
- `src/`
- `README.md`
- `PROJECT_CONTEXT.md`
- `CURRENT_STATE.md`
- `TODO.md`
- `ARCHITECTURE_NOTES.md`
- `WORKLOG.md`
- `DOMAIN_MAP.md`
- `REFACTOR_STRUCTURE.md`

### Also useful to version
- backup/export samples
- migration notes
- test plans

---

## What to Record in Each Refactor Step
For every meaningful change, record:
- scope of change
- files touched
- whether app behavior changed
- whether data model changed
- rollback concern level

---

## Suggested Refactor Safety Rules

### Rule 1
Before wiring a major structural change into live behavior, create a backup snapshot.

### Rule 2
Do not mix data-model changes with UI redesign in the same step.

### Rule 3
Do not change both kiosk intake shape and ops consumption shape at once unless explicitly planned.

### Rule 4
At each milestone, ensure there is one known-good version to fall back to.

---

## Current Reality
- AirBoss is not currently confirmed as a git repo in `~/Work/Airboss`
- Refactor scaffold has started
- Existing live app still depends on legacy single-file logic
- New architecture files are present but not yet wired into production behavior

---

## Best Next Practical Move
If Steve wants strong rollback safety, initialize git in the AirBoss project and make small checkpoint commits throughout the refactor.

That is the cleanest answer to: “what version are we on if shit gets fucked up?”

# GroundCore Stabilization Plan

_Updated: 2026-04-23_

## Situation
GroundCore is a promising prototype with backend hooks, but **not yet a pilot-safe shared ops system**.

Audit convergence is clear:
- shared truth is not authoritative yet
- auth/session boundaries are too weak
- kiosk/public boundary is too open
- workflow correctness bugs would create billing/handoff failures
- operator-facing state is inconsistent enough to damage trust

## Strategic rule
**No new features until truth, security, workflow correctness, and deployment reliability are stabilized.**

## Phase order
1. **P0: shared backend truth + data model + deployability**
2. **P0.2: auth/session hardening + kiosk/public boundary**
3. **P1: workflow correctness**
4. **P2: operator trust / UX alignment**

---

## P0 — Absolute pilot blockers

### P0.1 Shared backend truth
**Goal:** browser-local state is cache only, not an alternate system of record.

#### Required changes
- Remove silent pilot-mode dependence on browser-local truth.
- Stop presenting local-only fallback as normal successful operation.
- Replace blind 2-second full bootstrap overwrite model with a cleaner shared-state pattern.
- Make degraded/offline mode explicit in UI.
- Backend becomes authoritative for orders, messages, alerts, and thread reads.

#### Done when
- Hosted/pilot mode never silently behaves as local-only truth.
- Backend failures are visible.
- Writes either persist centrally or fail clearly.

### P0.2 General chat persistence contract
**Goal:** stop silent data loss for general chat.

#### Required changes
- Fix schema/API mismatch where frontend sends general chat with `orderId: null` but schema requires `order_messages.order_id not null`.
- Preferred fix: support nullable `order_id` plus an explicit/general channel model, or create a separate `general_messages` table.
- Update schema, repositories, API route, and bootstrap together.

#### Done when
- General chat persists correctly across refresh and across devices.
- Backend contract matches frontend intent.

### P0.3 Hosted deployment/init reliability
**Goal:** a fresh hosted deploy boots predictably.

#### Required changes
- Fix hosted bind assumptions (`HOST` / listen behavior).
- Add explicit schema/init path for hosted deploy.
- Add readiness/health verification that checks actual app readiness, not just process liveness.
- Make Render deployment steps deterministic.

#### Done when
- Fresh deploy can boot cleanly with expected env vars.
- Schema presence and app readiness are validated.

---

## P0.4 Auth/session hardening
**Goal:** internal ops auth is safe enough for a shared pilot.

#### Required changes
- Replace bearer-session-in-`localStorage` model for ops auth.
- Add server-side session tracking / revocation.
- Bind write actions to authenticated session role, not client payload role.
- Make auth enforcement consistent regardless of storage backend.

#### Done when
- Shared pilot users authenticate through a real session model.
- Logout/session invalidation actually works.
- Internal ops writes are never effectively unauthenticated.

## P0.5 Kiosk/public boundary hardening
**Goal:** public check-in cannot expose customer data or mint broad access too easily.

#### Required changes
- Restrict kiosk/check-in session issuance.
- Remove public PII exposure from tail lookup.
- Return only minimal autofill-safe data unless stronger proof is passed.
- Preserve future QR/mobile check-in design flexibility.

#### Done when
- Kiosk path no longer acts like a customer-data lookup surface.
- Public submission path is constrained to minimum required access.

---

## P1 — Workflow correctness

### P1.1 Fuel completion integrity
- Require `fuelActualGallons` whenever a fuel order exists.
- Block completion if actual gallons missing or invalid.
- If actual differs from requested, require note.

### P1.2 Hangar / overnight data integrity
- Standardize on `hangarOvernight` end-to-end.
- Remove stale `order.hangar` dependency in live ops UI.
- Ensure parking intent is visible to ramp and front desk.

### P1.3 Kiosk validation
- Require overnight parking choice.
- Require gallons if fuel type selected.
- Require departure date if departure time set.
- Tighten email/phone validation.
- Only show success when shared queue update truly succeeded.

### P1.4 Truthful communication state
- Stop auto-marking pre-departure emails as sent on `mailto:` open.
- Add explicit confirm-send path and store sent timestamp.

### P1.5 QR flow truthfulness
- Either implement a real QR check-in route or remove the placeholder button.

---

## P2 — Operator trust alignment

### P2.1 Queue/count consistency
- One canonical counting rule across Ramp and Front Desk.
- Same workload must produce same number everywhere.

### P2.2 Correct sender identity
- Chat sender role must come from authenticated user role.
- Ramp users must not post as `OFFICE`.

### P2.3 Remove demo-grade login UX
- No visible credentials in login UI.
- Real named pilot users.
- Forced password change / onboarding path remains clean.

### P2.4 Clear degraded/recovery UX
- Shared vs degraded mode clearly labeled.
- Explicit retry/recovery steps when sync fails.

---

## Execution order recommendation
1. Shared backend truth
2. General chat/data model correctness
3. Hosted deploy/init reliability
4. Auth/session hardening
5. Kiosk/public boundary hardening
6. Workflow correctness
7. Operator trust/UX alignment

## Pilot go/no-go bar
Pilot is **NO-GO** until all are true:
- one authoritative shared backend
- no silent local-only truth in pilot mode
- auth/session model hardened enough for shared use
- kiosk/public flow cannot expose customer data
- kiosk only claims success on real shared delivery
- fuel orders require actual gallons
- overnight parking intent survives end-to-end
- counts/banners align across views
- chat identity matches actual role
- hosted deploy boots reliably
- login no longer looks like a demo

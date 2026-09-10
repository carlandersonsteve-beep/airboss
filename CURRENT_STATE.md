# Current State — GroundCore / Flightline OS

_Updated: 2026-09-10_

GroundCore is the repository and system identity. **Flightline OS** is the operator-facing product name shown in the browser and installed PWA.

## Readiness summary

The application is locally pilot-capable and has a working shared/Postgres path. It is not approved for real customer data until the current security changes are deployed to staging and the hosted verification suite passes.

## Verified capabilities

- Cookie-backed staff sessions with server-side revocation
- Forced first-login password rotation
- Role-aware Ramp, Office, and Admin surfaces
- Login throttling and public-kiosk rate limiting
- Privacy-safe kiosk check-in with server-generated identifiers and field whitelisting
- Canonical order workflow: `pending` → `in_progress` → `ready_for_front_desk` → `closed`
- Server-enforced role transitions and fuel-completion integrity
- Cross-role order threads and persisted read state
- Kiosk → Ramp → Front Desk → finalize workflow
- Shared/Postgres persistence and concurrency coverage
- CSP, security headers, explicit CORS configuration, and secure-cookie support
- Audit logging for authentication, check-in, messaging, reads, and order changes

## Verification status

Passing locally on 2026-09-10:

- Auth cookie issuance, logout, and revoked-session rejection
- Forced password gate
- Login throttling
- Adversarial kiosk/privacy/role/fuel boundary checks
- Full API pilot path
- Multi-user concurrency/read-state path
- Full Playwright browser workflow with screenshots
- Node syntax checks and shell syntax checks
- `npm audit`: zero known production or development dependency vulnerabilities

## Deliberate privacy behavior

Entering a known tail number can show only masked email/phone hints and the aircraft type. The kiosk never receives the full saved contact record. A returning pilot may enter the last four digits of the saved phone number to obtain a short-lived, signed verification token and reuse the contact record server-side. Choosing to update the information shows blank contact fields so prior personal data is not exposed in the browser.

## Remaining gates before two-person walkthrough

1. Deploy the current branch to a staging Render/Supabase environment.
3. Configure unique hosted secrets, exact allowed origins, TLS, and explicit pilot credentials.
4. Run the hosted API smoke suite against staging.
5. Run the Playwright UI workflow against staging.
6. Clear old test records so the walkthrough starts with a clean operational board.

## Remaining limitations

- Customer completion email is still a client-side `mailto:` draft; delivery is not server-verified.
- Kiosk and login throttles are in memory and assume a single application instance.
- Fuel prices remain hardcoded.
- Human testing is still required on the actual kiosk/mobile hardware for touch behavior, PWA install, audio permissions, and practical scanability.
- A production backup/restore and retention policy for customer data must be documented and tested before broad use.

## Normal local verification

```bash
npm run local:start
npm run smoke:local
npm run db:seed-smoke-users
UI_SMOKE_BASE_URL=http://127.0.0.1:8792 npm run smoke:ui-pilot-path
```

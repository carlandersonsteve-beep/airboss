# GroundCore / Flightline OS TODO

_Updated: 2026-09-10_

## Walkthrough gate

- [ ] Commit and push the current security/readiness pass
- [ ] Deploy staging on Render with Supabase Postgres
- [ ] Use unique `SESSION_SECRET` and `CHECKIN_SECRET`
- [ ] Set exact production `ALLOWED_ORIGINS`
- [ ] Create unique temporary pilot credentials and require first-login rotation
- [ ] Run `npm run smoke:hosted` successfully against staging
- [ ] Run the Playwright UI pilot path successfully against staging
- [ ] Clear synthetic/test orders before the human walkthrough
- [ ] Conduct the two-person Ramp ↔ Front Desk browser walkthrough

## Security and privacy follow-through

- [ ] Define customer-data retention and deletion policy
- [ ] Verify Supabase backup/restore procedure with a non-production restore drill
- [ ] Decide whether public kiosk throttling needs a shared store before any multi-instance deployment
- [ ] Add alerting for repeated kiosk/login throttling and unusual authentication failures
- [ ] Add dependency and smoke checks to CI
- [ ] Review access logs and audit-event retention before real customer use

## Pilot operations

- [ ] Validate kiosk touch flow on the actual device
- [ ] Validate PWA installation and cache updates on iPhone/iPad and desktop
- [ ] Confirm Ramp and Front Desk counts against the same live workload
- [ ] Verify mobile notification audio after a real user gesture
- [ ] Decide whether completion email remains a manual draft or moves server-side
- [ ] Move fuel prices into controlled configuration/admin

## Verified on 2026-09-10

- [x] Full kiosk → Ramp → Front Desk → closed API workflow
- [x] Full browser workflow with refresh persistence
- [x] Cross-role messages and read-state persistence
- [x] Concurrent Ramp and Office sessions
- [x] Cookie sessions, logout/revocation, and password gate
- [x] Login throttling
- [x] Public lookup does not disclose existing customer data
- [x] Kiosk payload whitelist and server-generated IDs
- [x] Role-specific order mutation enforcement
- [x] Server-side actual-fuel, variance-note, and meter validation
- [x] Oversized JSON request rejection
- [x] Dependency audit with zero known vulnerabilities

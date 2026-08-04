# GroundCore Go-Live Checklist

This is the practical first-use checklist for getting GroundCore live without being sloppy.

## 1) Deployment target

Recommended first deployment shape:

- **One web service** running the Node app
- **One shared Postgres database**
- **HTTPS only** in front of the app
- Small real pilot group first, not a broad rollout

Render remains the fastest default path.

## 2) Render service settings

Use the repo `render.yaml` as the baseline and verify these before launch:

- Runtime: **Node**
- Start command: app server start command from `render.yaml`
- Health check path: **`/health`**
- Auto-deploy: on for controlled updates, off if you want manual release gates
- Instance type: start small, but not on a plan that sleeps aggressively during active ops windows

## 3) Required environment variables

Set these explicitly in hosted config:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CHECKIN_SECRET`
- `HOST`
- `PORT`
- `NODE_ENV=production`
- `ALLOWED_ORIGINS`
- `APP_BASE_URL` if your deploy docs/config expect it
- `DATABASE_SSL_MODE=require` when using hosted Postgres that expects TLS
- `LOGIN_RATE_LIMIT_WINDOW_MS`
- `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- `LOGIN_RATE_LIMIT_BLOCK_MS`
- `TRUST_PROXY=1` only if your hosted edge strips/spoofs `X-Forwarded-For` safely

Rules:

- `SESSION_SECRET` must be long and random
- `CHECKIN_SECRET` must be long and random
- `ALLOWED_ORIGINS` should be the exact production GroundCore origin(s), not `*`
- `HOST` should be explicitly set for hosted runtime behavior

## 4) Pre-launch security minimums

Before first real use, confirm:

- Cookies are `HttpOnly`
- Cookies are `SameSite=Lax`
- Secure cookies are enabled in production/HTTPS
- CSP is still active
- CORS only allows intended origins
- No seeded credentials are displayed in the UI
- No repo-default or shared temporary passwords are used for hosted staff accounts
- Temporary seeded passwords require first-login rotation
- `/change-password` works and reissues the session correctly
- Old session is revoked on password change/logout
- Login throttling is enabled with deliberate non-zero limits
- Audit events for auth and order workflow actions are reaching logs

## 5) User/password launch procedure

For the first live pilot:

1. Seed or create the initial users
2. If using `npm run db:seed-users` in production, provide explicit `SEED_PASSWORD_<USERNAME>` env vars for each user (or you will be blocked by default)
3. Distribute **unique temporary** passwords out-of-band
4. Require each user to log in individually and complete first-login password change
5. Do **not** share one department login across multiple humans if you can avoid it
6. Keep at least one admin account controlled by you

Recommended immediate first-day roles:

- 1 admin
- 2+ ramp users
- 2+ office users
- 1 kiosk/shared kiosk account only if needed for kiosk-auth flows

## 6) Hosted smoke-test sequence

Run these against the hosted URL before real traffic:

```bash
# First reset the dedicated smoke users so the password-gate check starts clean.
npm run db:seed-users

SMOKE_BASE_URL=https://your-groundcore-host \
SMOKE_ORIGIN=https://your-groundcore-host \
npm run smoke:hosted
```

If you need to isolate a single failing check, you can still run the individual smoke commands one by one.

For local verification, use the wrapper that reseeds the smoke users first so the password-gate check stays rerunnable:

```bash
npm run smoke:local
```

Optional higher-confidence browser pass:

```bash
UI_SMOKE_BASE_URL=https://your-groundcore-host node scripts/ui-pilot-path.mjs
```

Pass criteria:

- `/health` is green
- login cookie path works
- first-login password gate works
- login throttling returns `429` with `Retry-After` after repeated failures
- kiosk → ramp → office workflow completes
- same-order concurrency/read-state behavior holds across distinct users
- closed order persists after refresh

## 7) Launch-day operator checks

Before opening the tool for live use:

- Confirm app loads over HTTPS
- Confirm login works from a real browser session
- Confirm one ramp user can complete password change
- Confirm one office user can complete password change
- Confirm kiosk check-in creates a real order
- Confirm ramp can see and progress the order
- Confirm office can receive handoff and close the order
- Confirm thread messages persist across refresh
- Confirm logs are quiet except for expected auth noise
- Confirm audit log lines appear for login, password change, check-in/order progression, and logout

## 8) Known caveat you are accepting for pilot

Current finalize behavior still relies on **client-side `mailto` draft flow**.

That means:

- workflow completion is operationally usable
- draft creation can be validated
- actual outbound email delivery is **not** server-enforced or automation-verified yet

That is acceptable for pilot use if staff understands it.

## 9) Cheap hardening still worth doing soon

Post-launch but high priority:

- Add a dedicated hosted smoke wrapper script for pre-release checks
- Add an operator/admin view for user reset / password reset lifecycle
- Decide whether login throttling should remain in-memory or move to a shared store before multi-instance deployment
- Decide whether audit events should stay log-based or also persist server-side
- Decide whether finalize should stay `mailto` or move server-side after real usage feedback

## 10) Rollback / break-glass plan

If something feels unstable during first live use:

- stop new users from logging in
- keep current browser sessions limited to essential staff
- capture `/health` output and recent logs
- verify database reachability and session behavior
- reseed/reset pilot users only if you intentionally want to force a fresh password-setup cycle
- if email/finalize becomes confusing, fall back to manual customer follow-up while keeping GroundCore for operational tracking

## 11) Recommended first real pilot motion

Best sequence:

1. Deploy hosted app
2. Run hosted smoke suite
3. Create/reset pilot users
4. Have one ramp + one office operator complete first-login password change
5. Run one fake-but-realistic check-in internally
6. Start with a tiny live usage window
7. Debrief after first actual day and tighten whatever showed friction

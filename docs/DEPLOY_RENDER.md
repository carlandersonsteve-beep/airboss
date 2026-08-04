# Deploy GroundCore on Render

## Required before deploy
- A Render account
- A Supabase Postgres connection string (`DATABASE_URL`)
- A stable `SESSION_SECRET` (Render can generate this)
- A distinct `CHECKIN_SECRET`
- Explicit `ALLOWED_ORIGINS` for the production frontend origin(s)
- Explicit `HOST` for the deployment environment
- `SECURE_COOKIES=true` if your hosted environment terminates TLS upstream but does not expose an HTTPS host string to Node

## Fast path
1. Push this repo to GitHub.
2. In Render, create a new **Blueprint** or **Web Service** from the repo.
3. If using the included `render.yaml`, Render will detect:
   - build: `npm install`
   - start: `npm run start`
   - health check: `/health`
4. Set `DATABASE_URL` in Render from your Supabase Postgres connection string.
5. Let Render generate `SESSION_SECRET` or provide your own.
6. Set a distinct `CHECKIN_SECRET`.
7. Set `ALLOWED_ORIGINS` to the exact production app origin(s).
8. Set `HOST` deliberately for the deployment target.
9. Deploy.

## After first deploy
- Visit `/health`
- Reset the dedicated smoke users with `npm run db:seed-users`
- Run the hosted smoke wrapper:
  ```bash
  SMOKE_BASE_URL=https://your-groundcore-host \
  SMOKE_ORIGIN=https://your-groundcore-host \
  npm run smoke:hosted
  ```
- Log in through the ops UI
- Confirm each seeded user is forced through the first-login password change path
- Confirm kiosk + ops + front desk flow
- Install as a PWA from the browser

## Notes
- GroundCore serves both frontend and backend from one Node service.
- Kiosk check-in remains open by design.
- Ops auth now uses an HttpOnly `groundcore_session` cookie; frontend requests must allow credentials and `ALLOWED_ORIGINS` must be explicit when crossing origins.
- The API now returns `Access-Control-Allow-Credentials: true` and hosted-safe security headers; do not use `*` for allowed origins.
- The included `render.yaml` now pins `NODE_ENV=production`, sets `DATABASE_SSL_MODE=require`, and trusts Render's proxy headers by default; override only if your edge behavior is different.
- For production, use Supabase Postgres instead of the local file store.

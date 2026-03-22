# Deploy AirBoss on Render

## Required before deploy
- A Render account
- A Supabase Postgres connection string (`DATABASE_URL`)
- A stable `SESSION_SECRET` (Render can generate this)

## Fast path
1. Push this repo to GitHub.
2. In Render, create a new **Blueprint** or **Web Service** from the repo.
3. If using the included `render.yaml`, Render will detect:
   - build: `npm install`
   - start: `npm run start`
   - health check: `/health`
4. Set `DATABASE_URL` in Render from your Supabase Postgres connection string.
5. Let Render generate `SESSION_SECRET` or provide your own.
6. Deploy.

## After first deploy
- Visit `/health`
- Log in through the ops UI
- Confirm kiosk + ops + front desk flow
- Install as a PWA from the browser

## Notes
- AirBoss serves both frontend and backend from one Node service.
- Kiosk check-in remains open by design.
- Ops write routes now require a signed session token.
- For production, use Supabase Postgres instead of the local file store.

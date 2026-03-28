# TODO

## Testing Queue (pre-pilot with Tacie — 2026-03-28)
- [ ] Full ramp workflow end-to-end: kiosk check-in → ramp sees order → Start Service → Complete → Front Desk close
- [ ] Verify horse whinny fires on mobile (audio unlock — Tacie's phone)
- [ ] Verify general chat messages persist across refresh (fixed today — null orderId)
- [ ] Kiosk check-in: confirm tail number saves correctly on returned aircraft
- [ ] Kiosk check-in: confirm fuel request decimals save (e.g. 23.5)
- [ ] Thread read state persists correctly after refresh
- [ ] Order thread messages visible to both ramp and front desk
- [ ] Ramp banner count matches actual queue
- [ ] Front desk "Ready to Bill" count accurate
- [ ] No snap-back on Start Service (order transition fix verified)

## Next Up
- [ ] Render + Supabase deployment (so pilot isn't running off Steve's laptop)
- [ ] Pilot accounts for Lindsey, Neil, John (real credentials, forced password change)
- [ ] QR check-in flow (placeholder button exists, logic TBD)
- [ ] Mobile notification sound on order threads (not just general chat)

## Parking Lot (post-pilot)
- Real product definition and feature roadmap
- Phased refactor: shrink index.html monolith further
- Remove Google Sheets/Forms sync remnants or formalize
- Build system / proper module bundler

## Done ✅
- Horse whinny notification sound (Dragon Studio MP3, wired to incoming messages)
- Fuel quantity decimals preserved on completion
- Tail-first returning aircraft check-in on kiosk
- Start Service snap-back fixed (order transition + in-progress gate)
- Thread reads working locally
- Local order updates working
- Auth hardened, local-only backend access
- Ramp view repaired, scroll fixed, queue counts aligned
- Front desk filters scoped to ready queue, fuel totals rounded
- Ramp handoff banner aligned with today count
- Export/import buttons removed from top bar
- New Customer button replaced with QR placeholder
- General chat null orderId bug fixed (was throwing 401/requireField error)

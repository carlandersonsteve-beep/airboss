# Ops Surface Stabilization Notes

## Goal
Stabilize the newly extracted ops surface before the first serious review.

## Current extracted live components
- `OrderCard`
- `RampView`
- `OfficeView`

## Current bridge mechanism
- `window.AirBossComponents` for extracted component registration
- `window.AirBossDeps` for shared runtime dependencies
- `window.AirBossRuntime` for browser-safe service/selector logic

## Main stabilization concerns
1. Missing component load should fail loudly, not mysteriously
2. Shared dependency bag should be explicit and consistent
3. Extracted components should not silently depend on random in-file symbols
4. Review checkpoint should happen after bridge fragility is reduced, not while it is still ambiguous

## Immediate checks
- verify component resolver exists and throws clearly if a component script fails to load
- verify dependency bag includes every helper used by extracted components
- verify extracted components no longer rely on accidental global scope leakage
- verify first review happens after this pass, not mid-bridge

## Review readiness heuristic
Reasonable to open and review when:
- extracted ops components load through explicit resolution
- dependency bag is stable and documented
- no obvious missing-symbol risks remain in the extracted ops surface
- worklog/current state reflect the true checkpoint

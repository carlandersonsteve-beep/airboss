# Review Readiness

## Current status
AirBoss is now near the first worthwhile review checkpoint.

## Why
The major ops surface has been extracted and stabilized enough that a review is likely to reveal product/workflow issues instead of just extraction noise.

## Current extracted live pieces
- `OrderCard`
- `RampView`
- `OfficeView`
- `OrderMessageThread`
- `CompletionModal`

## Remaining transitional realities
- browser runtime bridge
- `window.AirBossComponents`
- `window.AirBossDeps`
- some remaining inline views/modals
- localStorage as live store

## Recommendation
One more small stabilization pass at most, then open and review.

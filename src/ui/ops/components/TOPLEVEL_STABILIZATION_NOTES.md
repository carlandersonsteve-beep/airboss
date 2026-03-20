# Top-Level Stabilization Notes

## What was tightened
- all extracted ops components now resolve through `getExtractedComponent(...)`
- extracted dependency publishing now happens through `publishAirBossDeps()` instead of an anonymous top-level object assignment

## Why it matters
This reduces top-level wiring ambiguity and makes the extracted component bridge easier to reason about.

## Remaining transitional architecture
- `window.AirBossDeps`
- `window.AirBossComponents`
- browser-loaded Babel component scripts

These are acceptable for the current local-first/build-light phase, but are still transitional.

# OfficeView Extraction Notes

## Current state
- `OfficeView.reference.js` preserves the current inlined implementation from `index.html`
- `OfficeView.js` is the extracted live-target component file
- wiring strategy mirrors `OrderCard` and `RampView`: browser globals + dependency bag, then alias in `index.html`

## Why this approach
AirBoss is still intentionally build-light and local-first.
This extraction pattern keeps the runtime simple while making the live app substantially easier to reason about.

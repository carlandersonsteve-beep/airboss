# RampView Extraction Notes

## Current state
- `RampView.reference.js` preserves the current inlined implementation from `index.html`
- `RampView.js` is the extracted live-target component file
- wiring strategy mirrors `OrderCard`: browser globals + dependency bag, then alias in `index.html`

## Why this approach
AirBoss is intentionally staying local-first and build-light right now.
This means extraction has to preserve runtime simplicity while reducing the size and responsibility of `index.html`.

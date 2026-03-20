# Shared Extraction Notes

## Current extracted shared pieces
- `OrderMessageThread`
- `CompletionModal`

## Why these matter
These two inline components are direct dependencies of the extracted ops surface.
Moving them out reduces hidden coupling between:
- extracted `OrderCard`
- the remaining inline content in `index.html`

## Current goal
Stabilize the extracted ops surface before the first serious review.
This is about reducing bridge fragility, not adding features.

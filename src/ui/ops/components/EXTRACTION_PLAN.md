# UI Extraction Plan

## Phase 1 UI extraction order
1. `OrderCard`
2. `RampView`
3. `OfficeView`

## Why this order
- `OrderCard` is high leverage and relatively contained
- `RampView` depends heavily on `OrderCard`
- `OfficeView` is broader and should follow after patterns are proven

## Current status
- `OrderCard.reference.js` created from live `index.html`
- `OrderCard.js` scaffolded as extraction target
- `OrderCard.props.md` documents the initial prop contract

## Definition of done for OrderCard extraction
- extracted module holds live-equivalent behavior
- prop contract is explicit
- app loads extracted version successfully
- `index.html` no longer contains the inlined `OrderCard` implementation
- behavior is verified in local testing

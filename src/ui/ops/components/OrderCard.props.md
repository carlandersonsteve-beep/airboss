# OrderCard Props Contract (Draft)

## Current observed props from live app
- `order`
- `customer`
- `updateOrderStatus`
- `addTicket`
- `messages`
- `addMessage`
- `startOrderService`
- `markOrderReadyForFrontDesk`

## Current responsibilities
- display aircraft/order summary
- show current status badge
- handle fuel verification flow
- collect completion notes
- allow service start
- allow service completion
- trigger handoff to front desk

## Extraction notes
This component is a good first extraction target because:
- it has meaningful workflow behavior
- it is reusable within ramp flows
- it is complex enough to justify modularization
- extracting it reduces `index.html` size without requiring an immediate full app split

## Risk areas
- embedded modal behavior
- fuel verification state
- direct dependency on helper functions in the current file
- reliance on existing styling and in-scope helpers

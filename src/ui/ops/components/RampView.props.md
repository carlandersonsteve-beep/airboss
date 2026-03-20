# RampView Props Contract (Draft)

## Current observed props from live app
- `customers`
- `orders`
- `tickets`
- `onNewOrder`
- `onNewCustomer`
- `onQuickFuel`
- `updateOrderStatus`
- `addTicket`
- `messages`
- `addMessage`
- `startOrderService`
- `markOrderReadyForFrontDesk`

## Current responsibilities
- show current ramp workload
- expose quick actions for arrival/customer/fuel entry
- display active orders for the current day
- render `OrderCard` for each active order
- summarize current-day operations stats

## Extraction notes
`RampView` is the correct second extraction target because:
- it is tightly coupled to `OrderCard`
- it consumes shared selector logic
- it is a major top-level work surface in the app

## Risk areas
- dependency on selector helpers
- dependency on extracted `OrderCard`
- top-level view switching still controlled by `index.html`

# OfficeView Props Contract (Draft)

## Current observed props from live app
- `orders`
- `customers`
- `tickets`
- `updateOrderStatus`
- `recallOrder`
- `resolveTicket`
- `deleteTicket`
- `generateCompletionEmail`
- `messages`
- `addMessage`
- `closeOrder`

## Current responsibilities
- show front desk billing/completion queue
- display pending ramp notifications/tickets
- manage archive/today/week/all filtering
- support pre-departure email actions
- finalize or reopen orders
- trigger customer email actions

## Extraction notes
This is the broadest of the three initial UI extraction targets.
It is worth extracting because it removes a large amount of operational UI logic from `index.html`.

## Risk areas
- filter/state logic inside the component
- pre-departure email flow
- archive/ready status behavior
- ticket action wiring

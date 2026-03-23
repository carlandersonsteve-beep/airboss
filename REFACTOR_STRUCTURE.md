# GroundCore Refactor Structure

## Goal
Refactor GroundCore into a maintainable product structure **without changing the core workflow first**.

This is a structure-first refactor.
The objective is to separate concerns, normalize the domain model, and make future backend migration straightforward.

---

## 1. Refactor Strategy

### Do now
- separate UI from logic
- centralize persistence
- define canonical entities
- extract workflow rules
- keep existing behavior mostly intact

### Do not do yet
- full backend rewrite
- auth/permissions buildout
- heavy real-time infrastructure
- deep integration expansion
- large UX redesign

---

## 2. Recommended Target Structure

```text
Airboss/
  index.html
  kiosk.html
  DOMAIN_MAP.md
  REFACTOR_STRUCTURE.md
  src/
    app/
      opsApp.js
      kioskApp.js
    core/
      constants.js
      types.js
      workflow.js
      validators.js
    data/
      storage.js
      repositories/
        customerRepository.js
        orderRepository.js
        ticketRepository.js
        messageRepository.js
        marketingRepository.js
      sync/
        sheetsSync.js
        formsBackup.js
        exportImport.js
    domain/
      customers/
        customerService.js
      orders/
        orderService.js
        orderSelectors.js
      tickets/
        ticketService.js
      messages/
        messageService.js
      calendar/
        calendarService.js
      communications/
        emailTemplates.js
    ui/
      shared/
        components/
          Header.js
          StatCard.js
          Modal.js
          Badge.js
        utils/
          formatters.js
          dates.js
      ops/
        FBOSystem.js
        views/
          RampView.js
          OfficeView.js
          ChatView.js
          CalendarView.js
          CustomerView.js
        components/
          OrderCard.js
          OrderMessageThread.js
          CompletionModal.js
        modals/
          CustomerModal.js
          OrderModal.js
          QuickFuelModal.js
      kiosk/
        CheckInKiosk.js
        steps/
          WelcomeStep.js
          AircraftStep.js
          PilotStep.js
          ServicesStep.js
          ConfirmStep.js
          SuccessStep.js
```

---

## 3. What Each Layer Owns

## 3.1 `app/`
Thin entrypoints only.

Responsibilities:
- boot the correct app
- mount React root
- wire high-level dependencies

Should not contain:
- business rules
- storage details
- workflow logic

---

## 3.2 `core/`
Pure product rules and definitions.

### `constants.js`
Examples:
- storage keys
- status constants
- sender roles
- service lists
- fuel type options

### `types.js`
Defines canonical shapes for:
- Customer
- Order
- Ticket
- Message
- MarketingLead

Even if this starts as plain JS with JSDoc, define it explicitly.

### `workflow.js`
Owns order transition logic.

Examples:
- allowed transitions
- recall rules
- fuel verification requirement
- status label mapping

### `validators.js`
Owns basic validation.

Examples:
- required tail number
- valid fuel quantity
- valid departure fields
- safe order payload normalization

---

## 3.3 `data/`
Owns persistence and synchronization.

### `storage.js`
Single wrapper around localStorage.

Responsibilities:
- get/set JSON safely
- namespaced key access
- migration hooks later

### `repositories/`
One repository per entity.

Responsibilities:
- list/get/create/update/delete operations
- consistent read/write patterns
- no UI logic

Example:
- `orderRepository.create(order)`
- `orderRepository.update(orderId, patch)`
- `orderRepository.list()`

### `sync/`
Owns all side-channel writes.

#### `sheetsSync.js`
- Google Apps Script writes

#### `formsBackup.js`
- Google Forms backup posts

#### `exportImport.js`
- backup export/import logic

Important rule:
UI should not call `fetch()` directly for persistence side effects.

---

## 3.4 `domain/`
Owns use-case logic.

This is where the product actually becomes maintainable.

### `orders/orderService.js`
Examples:
- create order
- start service
- complete service
- recall order
- finalize/close order
- mark pre-departure email sent

### `orders/orderSelectors.js`
Examples:
- get today orders
- get active ramp orders
- get ready-for-front-desk orders
- calculate fuel totals
- build calendar event list

### `customers/customerService.js`
Examples:
- create customer
- update customer
- find matching aircraft/customer

### `tickets/ticketService.js`
Examples:
- create operational alert
- resolve ticket
- delete ticket

### `messages/messageService.js`
Examples:
- send general message
- send order-linked message
- unread calculation

### `calendar/calendarService.js`
Examples:
- derive arrival/departure events from orders
- date grouping helpers

### `communications/emailTemplates.js`
Examples:
- completion email builder
- pre-departure email builder

Important rule:
Views ask domain services to do things.
Views should not implement the business process themselves.

---

## 3.5 `ui/`
Owns rendering, interaction, and layout.

### `ui/shared/`
Reusable presentational components and display helpers.

### `ui/ops/`
Operations app UI only.

#### `views/`
Top-level work surfaces:
- RampView
- OfficeView
- ChatView
- CalendarView
- CustomerView

#### `components/`
Smaller reusable ops-specific pieces:
- OrderCard
- OrderMessageThread
- CompletionModal trigger blocks

#### `modals/`
Customer/order/quick-fuel forms

### `ui/kiosk/`
Kiosk-specific flow and step screens.

---

## 4. Immediate Module Extraction Order

Do this in order, not all at once.

## Step 1 — extract constants and storage
Create:
- `src/core/constants.js`
- `src/data/storage.js`

Move:
- storage keys
- fuel options
- service option lists
- status values
- localStorage wrapper

Why first:
This is low-risk and instantly reduces duplication.

---

## Step 2 — extract repositories
Create:
- `customerRepository.js`
- `orderRepository.js`
- `ticketRepository.js`
- `messageRepository.js`

Move all read/write logic out of React components.

Why second:
This centralizes persistence before any deeper refactor.

---

## Step 3 — extract workflow logic
Create:
- `workflow.js`
- `orderService.js`

Move:
- start-service rules
- complete-service rules
- recall rules
- finalize rules
- fuel verification requirements

Why third:
This removes the most important business rules from UI components.

---

## Step 4 — extract email and sync logic
Create:
- `emailTemplates.js`
- `sheetsSync.js`
- `formsBackup.js`

Move:
- `generateCompletionEmail`
- pre-departure email builder
- Google sync code
- Google Forms backup code

Why fourth:
Communication and sync are cross-cutting concerns and should not live in views.

---

## Step 5 — split UI into files
Move views/components out of `index.html` and `kiosk.html`.

Recommended order:
1. `RampView`
2. `OrderCard`
3. `OfficeView`
4. `CustomerModal`
5. `OrderModal`
6. `QuickFuelModal`
7. `ChatView`
8. `CalendarView`
9. Kiosk step components

Why this order:
It attacks the highest-value ops surfaces first while preserving usability.

---

## 5. Recommended Canonical Interfaces

These are not final backend schemas. They are the normalization layer for the refactor.

## Customer
```js
{
  id,
  createdAt,
  tailNumber,
  aircraftType,
  ownerName,
  pilotName,
  phone,
  email,
  company,
  homeBase,
  notes,
  source
}
```

## Order
```js
{
  id,
  customerId,
  createdAt,
  status,
  statusUpdatedAt,
  arrivalSource,
  fuelType,
  fuelRequestedGallons,
  fuelActualGallons,
  parkingType,
  services,
  notes,
  completionNotes,
  arrivalAt,
  departureDate,
  departureTime,
  purpose,
  preDepartureSent
}
```

## Ticket
```js
{
  id,
  type,
  orderId,
  customerId,
  createdAt,
  status,
  message,
  submittedBy,
  notes
}
```

## Message
```js
{
  id,
  channel,
  orderId,
  senderRole,
  text,
  createdAt
}
```

---

## 6. Rules for the Refactor

### Rule 1
No direct `localStorage` access from UI components.

### Rule 2
No direct `fetch()` calls from UI components for sync/backup.

### Rule 3
No workflow transitions hard-coded in buttons or modals.

### Rule 4
One canonical status model only.

### Rule 5
Normalize incoming legacy records at the repository or service layer.

### Rule 6
Keep labels/user-facing wording separate from domain constants.

---

## 7. Example Responsibility Split

### Bad current pattern
`OrderCard`:
- edits fuel
- mutates storage
- triggers sync
- changes status
- manages completion notes

### Better refactor pattern
`OrderCard`:
- collects input
- calls `orderService.completeOrder(orderId, payload)`

`orderService.completeOrder(...)`:
- validates payload
- computes updated order
- applies workflow rule
- saves through repository
- triggers sync/backup hooks

This is the core architectural shift GroundCore needs.

---

## 8. What Success Looks Like After Phase 1

After the first refactor phase:
- GroundCore still behaves roughly the same
- current workflow is preserved
- files are separated by responsibility
- order workflow is explicit and testable
- localStorage remains in use temporarily, but behind clean interfaces
- backend migration becomes straightforward later

---

## 9. Suggested First Milestone

### Milestone: “Structured local-first AirBoss”
Deliverables:
- canonical entities defined
- repositories extracted
- workflow extracted
- UI split into files
- no direct storage writes in UI
- no direct sync calls in UI

Do that before backend work.

---

## 10. Summary

The correct next move is not a ground-up rewrite.
The correct next move is to give the current product a real spine.

This structure does that while preserving speed and keeping the system simple enough for phased execution.

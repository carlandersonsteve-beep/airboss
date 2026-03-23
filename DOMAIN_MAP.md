# GroundCore Domain Map

## Purpose
This document maps the current GroundCore data model, workflow, and key architectural boundaries based on the current `index.html` and `kiosk.html` implementation.

The goal is not to describe the ideal future state. The goal is to make the current system legible so refactoring can happen without breaking core operations.

---

## 1. Current Entry Points

### Operations app
- `index.html`
- Main operational interface for ramp and front desk
- Also contains chat, calendar, customer management, order management, ticket handling, import/export, and customer email generation

### Customer kiosk
- `kiosk.html`
- Customer-facing check-in flow
- Creates customers and orders directly into browser storage
- Also writes marketing leads and Google Forms backup records

---

## 2. Current Persistence Model

AirBoss currently uses browser `localStorage` as its primary system of record.

### Current storage keys
- `fbo_customers`
- `fbo_orders`
- `fbo_tickets`
- `fbo_messages`
- `fbo_last_read_chat`
- `marketing_list`

### Current backup/sync mechanisms
- Google Apps Script endpoint via `syncToSheets()`
- Google Forms backup POSTs via `fetch(..., { mode: 'no-cors' })`

### Architectural reality
`localStorage` is the live operational store. Google integrations are best-effort side channels, not authoritative persistence.

---

## 3. Current Core Entities

## 3.1 Customer

### Observed fields
From `CustomerModal` and kiosk flow:
- `id`
- `createdAt`
- `tailNumber`
- `aircraftType`
- `ownerName`
- `pilotName`
- `phone`
- `email`
- `company`
- `homeBase`
- `notes`
- `source` (kiosk only)

### Current role
Represents aircraft-linked customer/contact identity and preferences.

### Current issues
- Customer serves as both CRM record and aircraft record
- Aircraft identity and human contact identity are blended together
- Some order screens still snapshot customer-facing data directly onto orders

---

## 3.2 Order

### Observed fields
From `OrderModal`, kiosk flow, and order update logic:
- `id`
- `customerId`
- `createdAt`
- `status`
- `statusUpdatedAt`
- `customerName` (kiosk path)
- `tailNumber` (sometimes duplicated on order)
- `aircraft` (kiosk path)
- `fuelType`
- `fuelQuantity`
- `hangar`
- `hangarOvernight`
- `services`
- `notes`
- `completionNotes`
- `completedAt`
- `arrivalTime`
- `departureDate`
- `departureTime`
- `purpose`
- `source`
- `preDepartureSent`

### Current role
Represents an arrival/service job moving through the operation.

### Architectural reality
This is the true operational center of the product.

### Current issues
- Field naming is inconsistent:
  - `aircraftType` vs `aircraft`
  - `hangar` vs `hangarOvernight`
  - `customerName` appears in kiosk path but customer linkage is still `customerId`
- Order acts as both:
  - service work order
  - arrival record
  - billing-ready record
  - departure-planning record
- Some state mutation happens through React state, some directly through `localStorage`

---

## 3.3 Ticket

### Observed fields
From `addTicket()` and `QuickFuelModal`:
- `id`
- `createdAt`
- `status`
- `type`
- `orderId`
- `customerId`
- `tailNumber`
- `aircraftType`
- `fuelType`
- `fuelQuantity`
- `message`
- `submittedBy`
- `notes`

### Current role
Used as operational notifications or handoff items, especially from ramp to front desk.

### Current issues
- Ticket overlaps with message/note concepts
- Ticket is used as a notification queue, not a fully modeled task object
- Relationship between order status changes and ticket creation is inconsistent

---

## 3.4 Message

### Observed fields
From `addMessage()`:
- `id`
- `text`
- `sender` (`RAMP` or `OFFICE`)
- `orderId`
- `tailNumber`
- `createdAt`

### Current role
Supports general internal chat and potentially order-linked chat, although current `ChatView` mainly uses general messages without `orderId`.

### Current issues
- Message model is lightweight and useful, but boundaries are unclear:
  - what should be a chat message?
  - what should be a ticket?
  - what should be an order note?

---

## 3.5 Marketing Lead

### Observed fields
From kiosk flow:
- `email`
- `name`
- `tailNumber`
- `company`
- `signupDate`

### Current role
Separate simple marketing list generated from kiosk opt-in.

### Current issues
- Not integrated with broader customer model
- Likely should remain separate for now, but should be explicitly treated as a marketing/export concern rather than an operational core entity

---

## 4. Current Operational Workflow

## 4.1 Primary workflow

### Intake paths
1. Front desk/ramp manually creates customer and order in operations app
2. Customer self-checks in through kiosk, which creates customer and order directly

### Active service flow
1. Order is created with status `pending`
2. Ramp starts service:
   - if fuel is required, fuel type verification may be required first
   - status moves to `in-progress`
3. Ramp completes service:
   - actual fuel quantity can be edited
   - completion notes can be added
   - status moves to `ready`
4. Front desk processes ready order:
   - can email customer
   - can recall order back to ramp
   - can finalize and archive
5. Final order state becomes `finalized`

---

## 4.2 Current status model

### Status values observed
- `pending`
- `in-progress`
- `ready`
- `completed` (appears in UI logic, but is not the main current operational terminal state)
- `finalized`

### Actual practical state machine
Primary path:
- `pending` -> `in-progress` -> `ready` -> `finalized`

Recall/backstep paths:
- `ready` -> `in-progress`
- `finalized` -> `ready`

### Important note
`completed` exists in display logic but current ramp completion path uses `ready`, not `completed`.

Recommendation: standardize on one canonical workflow and remove dead/legacy statuses.

---

## 5. Current Views and Their Roles

## 5.1 Ramp View
Primary responsibilities:
- see active orders for today
- create new customer
- create new aircraft arrival/order
- quick fuel entry
- start service
- complete service
- hand off to front desk

Operational focus:
- speed
- current-day activity
- task execution

---

## 5.2 Front Desk View
Primary responsibilities:
- see `ready` orders
- manage billing/completion flow
- send customer emails
- review pre-departure prompts
- manage pending ramp tickets
- archive/finalize orders
- report/filter historical orders

Operational focus:
- handoff completion
- customer communication
- closing the loop

---

## 5.3 Chat View
Primary responsibilities:
- general internal communication between ramp and office

Current reality:
- useful, but under-defined relative to tickets and notes

---

## 5.4 Calendar View
Primary responsibilities:
- visualize arrivals from `createdAt`
- visualize departures from `departureDate` / `departureTime`

Current reality:
- derived view, not a separate planning system

---

## 5.5 Customer Management
Primary responsibilities:
- create/search/view customers
- reuse existing customer/aircraft records for new arrivals

Current reality:
- useful CRM-lite capability, but mixed aircraft/contact model

---

## 6. Current Domain Boundaries (Implicit)

The code currently mixes these concerns, but the product already implies these domain areas:

### 6.1 Customer domain
- customer records
- aircraft identity
- contact details
- preferences/notes

### 6.2 Operations domain
- arrivals
- service orders
- status transitions
- fuel/hangar/services
- departure prep

### 6.3 Communication domain
- internal chat
- ramp notifications/tickets
- internal completion notes
- customer email generation

### 6.4 Reporting/planning domain
- calendar
- archive/history
- fuel totals
- activity summaries

### 6.5 Backup/sync domain
- local browser persistence
- import/export backup
- Google Sheets / Forms side-channel sync

---

## 7. Key Architectural Problems Exposed by the Domain Map

## 7.1 Single object overload
`Order` currently does too much.
It is simultaneously:
- arrival record
- service record
- operational handoff object
- billing-ready object
- departure planning object

That is survivable now, but only if the shape is cleaned up.

## 7.2 Field inconsistency
Examples:
- `aircraftType` vs `aircraft`
- `hangar` vs `hangarOvernight`
- fuel type capitalization may drift

This will create reporting bugs and migration pain if not normalized early.

## 7.3 Communication concepts are blurred
Current communication happens through:
- `tickets`
- `messages`
- `completionNotes`
- email generation

These need clearer semantic boundaries.

## 7.4 Persistence is not centralized
The app uses:
- React state
- `Storage.set(...)`
- direct `localStorage.setItem(...)`
- Google sync side effects

This makes correctness harder to guarantee.

## 7.5 Business rules live in UI components
Workflow transitions and persistence side effects are embedded directly in views and modals.

That makes the app harder to test, reason about, and migrate.

---

## 8. Proposed Canonical Domain Model for Refactor

Do not overcomplicate this yet. Keep the same product shape, but normalize it.

## 8.1 Customer
Suggested canonical fields:
- `id`
- `createdAt`
- `tailNumber`
- `aircraftType`
- `ownerName`
- `pilotName`
- `phone`
- `email`
- `company`
- `homeBase`
- `notes`
- `source`

## 8.2 Order
Suggested canonical fields:
- `id`
- `customerId`
- `createdAt`
- `status`
- `statusUpdatedAt`
- `arrivalSource`
- `fuelType`
- `fuelRequestedGallons`
- `fuelActualGallons`
- `parkingType` (`none`, `transient`, `overnight`, `outside` or similar)
- `services`
- `notes`
- `completionNotes`
- `arrivalAt`
- `departureDate`
- `departureTime`
- `purpose`
- `preDepartureSent`

Note: prefer snapshotting display-critical data separately only when there is a strong operational reason.

## 8.3 Ticket
Suggested canonical fields:
- `id`
- `type`
- `orderId`
- `createdAt`
- `status`
- `message`
- `submittedBy`
- `notes`

Keep it focused as an operational alert/handoff item.

## 8.4 Message
Suggested canonical fields:
- `id`
- `channel` (`general` or `order`)
- `orderId`
- `senderRole`
- `text`
- `createdAt`

---

## 9. Recommended Workflow Definition for Refactor

Use one canonical order state machine.

### Canonical states
- `pending`
- `in_progress`
- `ready_for_front_desk`
- `closed`

If you want UI labels to stay friendly, map them in the UI.

### Transition rules
- `pending` -> `in_progress`
- `in_progress` -> `ready_for_front_desk`
- `ready_for_front_desk` -> `closed`
- `ready_for_front_desk` -> `in_progress` (recall)
- `closed` -> `ready_for_front_desk` (reopen)

This removes ambiguity around `ready`, `completed`, and `finalized`.

---

## 10. Refactor Guardrails

During refactor:
- preserve the current operational flow
- do not redesign the user workflow first
- normalize naming before adding major new features
- centralize persistence before swapping backend
- keep kiosk and ops app aligned to the same canonical entity definitions

---

## 11. Summary

AirBoss already has a valid product core.
The codebase is not failing because the workflow is wrong.
The codebase is at risk because the domain model and architecture are still implicit.

This document makes them explicit so the next refactor can be deliberate instead of reactive.

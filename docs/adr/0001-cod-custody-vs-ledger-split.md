---
status: accepted
---

# Split COD cash custody in Dispatch Service from settlement ledger in Order Service

## Context

SwiftDrop supports Cash on Delivery (`COD`), where couriers (at doorstep POD) or branch staff (at branch handover) collect cash from recipients and hand it over to a branch before SwiftDrop settles net proceeds (`COD Amount - Delivery Fee`) with merchants. Both `dispatch-service` (which owns POD and branch operations) and `order-service` (which owns orders, pricing, and payment references) touch this flow.

## Decision

`dispatch-service` owns operational cash custody (`COD Collection` records, courier-to-branch `Cash Handover` batches, and `DISCREPANCY` resolution) and emits domain events upon collection and handover verification. `order-service` consumes those events to own the financial ledger (`PaymentStatus`, merchant COD payable balances, and `COD Settlement` payout batches).

## Considered Options

- **Keep all COD custody and settlement tables in `order-service`**: rejected because POD submission and physical branch cash handovers happen synchronously inside `dispatch-service` workflows and would require distributed transactions across services.
- **Keep all COD settlement logic in `dispatch-service`**: rejected because `order-service` is the authoritative owner of `deliveryFee`, `codAmount`, `PaymentStatus`, and merchant financial records.

## Consequences

- `COD Settlement` batch generation in `order-service` must only include orders whose `Cash Handover` has been verified (`VERIFIED`, not `DISCREPANCY`) via `dispatch-service` events.
- `dispatch-service` remains decoupled from merchant payout schedules and bank transfer references.

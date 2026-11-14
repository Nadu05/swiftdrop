# Order Service events

The Order service publishes domain events to the RabbitMQ topic exchange **`swiftdrop.events`** (durable).
Consumers own their queues and bindings; the Order service never reads another service's database.

## Reliable publishing (transactional outbox)

1. When an order is created, the order, its first status-history row **and** an `outbox_events` row are
   written in **one database transaction** (`OrderEventRecorder`, propagation `MANDATORY`).
2. After the commit, a background relay (`OutboxPublisher`, every `swiftdrop.outbox.poll-interval-ms`)
   publishes pending rows as **persistent** JSON messages and waits for the broker's **publisher confirm**
   before marking the row `published_at`.
3. If the broker is down or nacks, the row stays pending and is retried with exponential backoff
   (`1, 2, 4 ... s`, capped at `swiftdrop.outbox.max-backoff-seconds`); `attempts` and `last_error` show why.
   The batch stops at the first failure so events keep their order.

Guarantees:

- No event is published for a transaction that rolled back, and a committed order always has its event row.
- Delivery is **at-least-once**. A crash between "broker confirmed" and "row marked published" re-sends the
  event, so **consumers must de-duplicate on `eventId`**.
- Several service instances can run the relay: rows are claimed with `FOR UPDATE SKIP LOCKED`.
- Publishing never blocks or fails the customer's request.

## Envelope (all events)

```json
{
  "eventId": "6b1f0c52-2f0e-4a8e-9a43-1d2f6f1d9c11",
  "eventType": "order.delivery.created",
  "eventVersion": 1,
  "occurredAt": "2026-11-13T10:15:30.123Z",
  "producer": "order-service",
  "correlationId": "5d0c3f7e-...",
  "data": { }
}
```

The AMQP message also carries `messageId` = `eventId`, content type `application/json`, delivery mode persistent.
`correlationId` is the request's `X-Correlation-Id` (generated when absent).

## `order.delivery.created.v1`

| | |
|---|---|
| Exchange | `swiftdrop.events` |
| Routing key | `order.delivery.created.v1` |
| Emitted | once, after a new order commits (a repeated idempotent request does not emit again) |
| Intended consumers | Dispatch (queue the parcel), Notification (confirm to the customer) |

`data` (ids and stable facts only, **no addresses, names or phone numbers**; fetch details from the Order API):

| Field | Type | Notes |
|---|---|---|
| `deliveryId` | number | Order id |
| `trackingNumber` | string | Public tracking number |
| `customerId` | number | Identity user id of the owner |
| `branchId` | number or null | Organization branch; null until resolved |
| `status` | string | `CREATED` |

## `order.delivery.status-changed.v1`

| | |
|---|---|
| Exchange | `swiftdrop.events` |
| Routing key | `order.delivery.status-changed.v1` |
| Emitted | once per real status change (`PATCH /orders/{id}/status`), after it commits. A rejected change (422) or a repeated request emits nothing |
| Intended consumers | Notification (tell the customer), Dispatch (react to delivered/failed) |

Written in the same transaction as the status update and its history row, through the same outbox as the created event.

`data` (ids and stable facts only; staff notes and locations are **not** included):

| Field | Type | Notes |
|---|---|---|
| `deliveryId` | number | Order id |
| `trackingNumber` | string | Public tracking number |
| `customerId` | number | Identity user id of the owner |
| `branchId` | number or null | Organization branch; null until resolved |
| `previousStatus` | string | Status before the change |
| `status` | string | New status: `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED` or `FAILED` |
| `changedAt` | string | When the change was made (UTC, ISO-8601) |

Compatibility: fields may be added within v1; removing or renaming a field requires a new routing key
(`...v2`) published alongside v1 for a transition period.

## Known limitation

The existing `order.events.queue` (bound to `order.#` in `RabbitMQConfig`) has no consumer, so events routed to
it accumulate. Real consumers should declare their own queues; this queue should be removed once agreed.

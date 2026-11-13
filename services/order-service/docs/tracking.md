# Delivery status, timeline, receipt and public tracking

## Status lifecycle

```
CREATED -> PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY -> DELIVERED
   \___________\____________\______________\______> FAILED   (from any status that is not final)
```

| From | Allowed next |
|---|---|
| `CREATED` | `PICKED_UP`, `FAILED` |
| `PICKED_UP` | `IN_TRANSIT`, `FAILED` |
| `IN_TRANSIT` | `OUT_FOR_DELIVERY`, `FAILED` |
| `OUT_FOR_DELIVERY` | `DELIVERED`, `FAILED` |
| `DELIVERED`, `FAILED` | none (final) |

Every other move, including repeating the current status, is rejected with `422` and changes nothing. Orders start
as `CREATED`. The rules live in one place, the `OrderStatus` enum.

Display labels: Created, Picked Up, In Transit, Out for Delivery, Delivered, Failed. Responses carry both the code
(`status`, for logic) and the label (`statusLabel`, for screens).

## Endpoints

| Endpoint | Who | Purpose |
|---|---|---|
| `PATCH /api/v1/orders/{id}/status` | couriers and staff (`COURIER`, `BRANCH_ADMIN`, `ADMIN`) | Move an order to its next status |
| `GET /api/v1/orders/{id}/timeline` | the order's customer | Full status history |
| `GET /api/v1/orders/{id}/receipt` | the order's customer | Receipt data |
| `GET /api/v1/tracking/{trackingNumber}` | anyone, no login | Safe public tracking |

Behind the gateway the first three are reachable at `/api/v1/orders/...` as usual. Public tracking is served at
`/api/v1/tracking/{n}` and also at `/api/v1/orders/tracking/{n}`, the path the existing gateway route already forwards
(the frontend uses it as its fallback), so it works without a dedicated gateway route.

### `PATCH /api/v1/orders/{id}/status`

```json
{ "status": "PICKED_UP", "note": "Collected from the sender", "location": "Colombo 03" }
```

`status` is required; `note` (max 1000) and `location` (max 255) are optional and kept in the private history only.

```json
{ "id": 7, "trackingNumber": "SD-261113-K7Q2XM4T", "previousStatus": "CREATED",
  "status": "PICKED_UP", "statusLabel": "Picked Up", "updatedAt": "2026-11-13T09:00:00Z" }
```

The response is deliberately small: a courier is not sent the customer's addresses or phone numbers. The change, its
history entry and its event (`order.delivery.status-changed.v1`, see [events.md](events.md)) are written in one
transaction, and the order row is locked meanwhile, so two simultaneous requests cannot both succeed: one wins, the
rest get `422`. The user id from the token is stored as the actor.

The allowed roles are configurable (`swiftdrop.security.status-update-roles`, env `ORDER_STATUS_UPDATE_ROLES`).
The names are **placeholders** until the Identity service fixes its role list. `CUSTOMER` is never accepted.

| Result | Meaning |
|---|---|
| `200` | changed |
| `400` | missing, unknown or malformed status; over-long note/location |
| `401` / `403` | no valid token / role not allowed (a customer is always `403`) |
| `404` | no such order |
| `422` | move not allowed from the current status |

### `GET /api/v1/orders/{id}/timeline` (private)

```json
{ "orderId": 7, "trackingNumber": "SD-261113-K7Q2XM4T", "currentStatus": "PICKED_UP", "currentStatusLabel": "Picked Up",
  "events": [
    { "status": "CREATED",   "statusLabel": "Created",   "note": "Order created", "location": null, "timestamp": "2026-11-13T08:00:00Z" },
    { "status": "PICKED_UP", "statusLabel": "Picked Up", "note": "Collected from the sender", "location": "Colombo 03", "timestamp": "2026-11-13T09:00:00Z" }
  ] }
```

Oldest first. Another customer's order, or one that does not exist, is `404` (ids cannot be probed). The id of whoever
made a change is never returned.

### `GET /api/v1/orders/{id}/receipt` (private)

Order id, tracking number, status, ordered and delivered times (`deliveredAt` is null until delivery), pickup and
delivery town, address and contact **name** (no phone numbers), parcel description, size, weight, distance, the fee
breakdown (`baseFee`, `weightFee`, `distanceFee`, `zoneSurcharge`), `totalFee` and `currency`. Every amount is the value
**stored when the order was placed**, not recalculated, so it always matches what was charged even if the tariff changes.
Same ownership rule as the timeline.

### `GET /api/v1/tracking/{trackingNumber}` (public)

```json
{ "trackingNumber": "SD-261113-K7Q2XM4T", "status": "IN_TRANSIT", "statusLabel": "In Transit",
  "origin": "Colombo", "destination": "Kandy", "parcelCategory": "MEDIUM", "distanceKm": 94.34,
  "updatedAt": "2026-11-13T09:00:00Z",
  "events": [
    { "status": "CREATED",    "statusLabel": "Created",    "description": "Order placed",         "timestamp": "2026-11-13T08:00:00Z" },
    { "status": "PICKED_UP",  "statusLabel": "Picked Up",  "description": "Parcel picked up from the sender", "timestamp": "2026-11-13T08:30:00Z" },
    { "status": "IN_TRANSIT", "statusLabel": "In Transit", "description": "Parcel is on its way", "timestamp": "2026-11-13T09:00:00Z" }
  ] }
```

What a stranger can see is an **allow-list** (`PublicTrackingResponse`):

| Shown | Never shown |
|---|---|
| tracking number, status and label | street addresses |
| pickup and delivery **town names** | contact names and phone numbers |
| parcel size, distance | customer id, branch id, order id, courier id |
| timeline: status, label, fixed description, time | staff notes and locations, the fee, parcel description, delivery instructions |

Event descriptions are fixed sentences per status, never staff text, because a note could contain personal details.
A failed delivery shows only "Delivery could not be completed".

Other behaviour:
- Unknown and malformed numbers return the **same** `404` ("Tracking number not found"), and malformed ones never reach
  the database, so nobody can tell which numbers exist. Numbers are random (`SD-yymmdd-XXXXXXXX`), not sequential.
- Case-insensitive (`sd-...` works).
- A stale or invalid `Authorization` header is ignored on this endpoint, so a logged-in browser with an expired
  token can still track.
- `Cache-Control: no-store`: the status changes, so it is never cached.
- It reads only the official history written by the Order service. Nothing is simulated.

## Limitations and open points

- The courier/staff **role names** are placeholders (see above).
- Status changes are made through the API only. Consuming Dispatch events to update the status automatically is not
  implemented; it needs the dispatch event contract from the Dispatch owner.
- `estimatedDelivery`, courier name and phone (fields the frontend type mentions) are not returned: the Order service
  does not own courier data (Dispatch does), and it has no delivery-time estimate.
- Old orders created before towns were recorded show no `origin`/`destination`.

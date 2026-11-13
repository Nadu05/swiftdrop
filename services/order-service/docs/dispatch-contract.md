# Dispatch contract: orders ready for a courier

The Dispatch service asks the Order service which orders still need a courier. Order owns orders and their official
status; Dispatch owns couriers and assignments, so Order does **not** know who is assigned. Dispatch removes the orders
it has already assigned.

## `GET /api/v1/orders/ready-for-dispatch`

(also `/orders/ready-for-dispatch` behind the gateway)

| Query | Type | Default | Notes |
|---|---|---|---|
| `branchId` | number, positive | none | Only orders of this branch. Orders whose branch is not resolved yet are returned only when no `branchId` is given |
| `limit` | number, 1 to 200 | 50 | Oldest orders first; an invalid value is `400` |

Returns a JSON array, oldest first (by creation time). An order is "ready" while its status is `CREATED` (placed,
not yet picked up). Once a courier marks it `PICKED_UP` (`PATCH /orders/{id}/status`) it leaves the list.

The field names are exactly those of Dispatch's `OrderDetailsDto`:

| Field | Comes from |
|---|---|
| `id` | order id |
| `orderNumber` | the tracking number (there is no separate order number) |
| `trackingNumber` | tracking number |
| `branchId` | branch, or null until branch resolution exists |
| `recipientName`, `recipientPhone`, `deliveryAddress` | the delivery contact and address |
| `city` | delivery town name (null for old orders without a town) |
| `merchantName`, `merchantContact` | the **pickup** contact name and phone (the sender) |
| `priority` | always `STANDARD` (no priority concept yet) |
| `packageType` | parcel size: `SMALL`, `MEDIUM`, `LARGE`, `EXTRA_LARGE` |
| `weightKg` | weight |
| `dimensions` | always null (dimensions are not collected) |
| `handlingNotes` | the customer's delivery instructions |
| `createdAt` | creation time in UTC, as a zone-less date-time (`2026-11-13T08:30:00`) |
| `pickupAddress` | **extra field**: where to collect the parcel (not in Dispatch's DTO yet, see below) |
| `pickupCity` | **extra field**: pickup town name (null for old orders) |

Example:

```json
[ { "id": 7, "orderNumber": "SD-261113-K7Q2XM4T", "trackingNumber": "SD-261113-K7Q2XM4T", "branchId": 3,
    "recipientName": "Ayesha Perera", "recipientPhone": "0718849201",
    "deliveryAddress": "12/4 Peradeniya Road, Kandy", "city": "Kandy",
    "merchantName": "Nuwan Pradeep", "merchantContact": "+94771234567",
    "priority": "STANDARD", "packageType": "MEDIUM", "weightKg": 1.5, "dimensions": null,
    "handlingNotes": "Call on arrival", "createdAt": "2026-11-13T08:30:00",
    "pickupAddress": "45 Galle Road, Colombo 03", "pickupCity": "Colombo" } ]
```

## Access

The response holds recipient names, phones and addresses, so it is **not** for customers or the public. Two kinds of
caller are accepted:

1. **A user token** with one of `swiftdrop.security.dispatch-read-roles` (default `DISPATCHER`, `BRANCH_ADMIN`, `ADMIN`,
   env `ORDER_DISPATCH_READ_ROLES`; `CUSTOMER` is never accepted). The role names are **placeholders** until the Identity
   service fixes its role list.
2. **The Dispatch service itself, with a shared service key**, because a backend service has no user token. It sends
   the header `X-Service-Key: <key>`. The key is configured in the Order service as `ORDER_SERVICE_API_KEY`
   (`swiftdrop.security.service-api-key`).

How the key is kept narrow:
- It works **only for `GET` on `/orders/ready-for-dispatch`** (and `/api/v1/orders/ready-for-dispatch`). On any other
  URL or method the header is ignored, so the key cannot read customer orders, timelines or receipts, or change a status.
- It must be at least **32 characters** (a shorter value stops the service at startup). **Empty = the feature is off**
  and the header is ignored.
- It is compared in constant time and never logged. Keep it in the environment (not in git) and use the same value in
  both services. Generate one with: `[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))`
  or `openssl rand -base64 32`.

Responses are `Cache-Control: no-store`. With authentication off (the current testing stage) no token or key is needed.

## What the Dispatch service must change (Member 07)

The Order service side is done and **nothing in the Dispatch service was changed** from here. Until Dispatch makes the
two changes below, it keeps working as before while the Order service has authentication off, and gets `401` once
authentication is switched on.

**1. Send the key** in `OrderServiceClient`: add a setting, for example
`services.order.service-key: ${ORDER_SERVICE_API_KEY:}`, and set the header when it is not empty:

```java
@Value("${services.order.service-key:}") String serviceKey   // constructor parameter

restClient.get().uri(...).accept(MediaType.APPLICATION_JSON)
        .headers(h -> { if (!serviceKey.isBlank()) h.set("X-Service-Key", serviceKey); })
        .retrieve()...
```

Set the **same** `ORDER_SERVICE_API_KEY` in both services (environment or `.env`, never in git). The Order service
reads it from `ORDER_SERVICE_API_KEY`. A `401` then means the key is missing or different.

**2. Use the pickup address** by adding two fields to `OrderDetailsDto` (getters and setters as for the others) and
passing them on to its response and screens:

```java
private String pickupAddress;   // where to collect the parcel
private String pickupCity;
```

Until Dispatch adds them, the two extra fields are simply ignored by its client (checked by the Order service's
`DispatchClientCompatibilityTest`), so nothing breaks.

## Remaining gaps

- **Branch.** `branchId` stays null until branch resolution (Organization service) is implemented, so filtering by
  branch returns nothing yet; call without `branchId` to get all ready orders.
- Dispatch could instead consume `order.delivery.created.v1` and `order.delivery.status-changed.v1`
  (see [events.md](events.md)); this endpoint is the pull-based alternative it already expects.

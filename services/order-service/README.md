# Order Service

Owns delivery orders, parcel details, the official delivery status/history, tracking numbers and order events.
Port `8083`. Behind the gateway it is reached at `/api/v1/orders/**` (the gateway strips `/api/v1/orders` to `/orders`;
the controller serves both paths).

## API (implemented so far)

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/v1/orders/cities` | `CUSTOMER` | The supported pickup/delivery towns (`code`, `name`, `district`) for the booking form. |
| `POST /api/v1/orders/quote` | `CUSTOMER` | The delivery fee **before** confirming: `estimatedFee`, `currency`, `estimatedDistanceKm` and a `breakdown`. Stores nothing. See [docs/pricing.md](docs/pricing.md). |
| `POST /api/v1/orders` | `CUSTOMER` | Create an order. Optional `Idempotency-Key` header (max 64 chars `A-Za-z0-9_.:-`): the same key returns the original order. |
| `GET /api/v1/orders` | `CUSTOMER` | List **your own** orders as a JSON array, newest first. Paging: `page` (from 0, default 0) and `size` (1-100, default 20); the total is in the `X-Total-Count` response header. |
| `GET /api/v1/orders/{id}` | `CUSTOMER` | Read one of **your own** orders. Someone else's order returns `404`. |
| `GET /api/v1/orders/{id}/timeline` | `CUSTOMER` | The delivery status timeline of **your own** order, oldest first. Someone else's order returns `404`. |
| `GET /api/v1/orders/{id}/receipt` | `CUSTOMER` | Receipt data for **your own** order: stored fee breakdown, towns, parcel details. |
| `PATCH /api/v1/orders/{id}/status` | `COURIER`, `BRANCH_ADMIN`, `ADMIN` (never `CUSTOMER`) | Move an order to its next status. Invalid moves return `422`. |
| `GET /api/v1/tracking/{trackingNumber}` | **public** (no login) | Status and timeline with safe information only. Also served at `/api/v1/orders/tracking/{n}`. |
| `GET /api/v1/orders/ready-for-dispatch` | `DISPATCHER`, `BRANCH_ADMIN`, `ADMIN`, or the Dispatch service with an `X-Service-Key` header | Orders waiting for a courier (status `CREATED`), oldest first, for the Dispatch service. Optional `branchId` and `limit` (1-200, default 50). Contains recipient contact details. See [docs/dispatch-contract.md](docs/dispatch-contract.md). |

Statuses, the allowed moves, and what the public page shows are in [docs/tracking.md](docs/tracking.md).


Order request fields: `pickupAddress`, `pickupContactName`, `pickupContactPhone`, `dropoffAddress`,
`dropoffContactName`, `dropoffContactPhone`, `parcelDescription?`, `parcelSize` (`SMALL|MEDIUM|LARGE|EXTRA_LARGE`),
`weightKg` (0.01 to 100, max 2 decimals, and within the limit for the size), `deliveryInstructions?`,
`pickupCity` and `dropoffCity` (codes from `GET /orders/cities`, both required), and optionally `expectedFee` (the fee
the customer saw: a different current fee returns `409` instead of charging something else). The customer id, fee,
tracking number, branch and status are **decided by the server**; any such fields in the body are ignored.

**Paths behind the gateway.** The gateway routes `/api/v1/orders/**` with `StripPrefix=3`, which removes `api`, `v1`
**and `orders`**, so the browser's `POST /api/v1/orders` reaches this service as `POST /`, `GET /api/v1/orders/cities` as
`GET /cities`, `GET /api/v1/orders/7/timeline` as `GET /7/timeline`, and so on. Every endpoint above is therefore served
on three prefixes (`/api/v1/orders`, `/orders` and the bare `/`) with identical security rules; `GatewayStrippedPathsTest`
checks the bare form with authentication on.

Errors always have `timestamp`, `status`, `error` and `message` (or `fieldErrors` for validation, `400`).
`401` no/invalid token, `403` wrong role, `404` not found or not yours, `409` conflict, `422` business rule,
`503` the Organization service could not assign a branch (nothing was created; try again).

## Authentication switch (testing stage)

Authentication is currently **OFF** by default (`swiftdrop.security.enabled: ${ORDER_AUTH_ENABLED:false}`):
no token is needed, and orders belong to customer `ORDER_DEV_CUSTOMER_ID` (default `1`), or to the customer in an
`X-Customer-Id` header (handy for trying the ownership rule with two customers). The header is **ignored** whenever
authentication is on. To restore JWT protection set `ORDER_AUTH_ENABLED=true` (and `JWT_SECRET`), or change the
default in `application.yml`. Do not deploy with authentication off.

## Security contract (to be confirmed with the Identity service)

JWT, HS256, signed with the shared `JWT_SECRET` (raw UTF-8 bytes). `sub` = numeric user id; claim `role` (override with
`JWT_ROLE_CLAIM`) = `CUSTOMER`. If `JWT_SECRET` is empty the service fails closed (every protected request is `401`).

### Service key for the Dispatch service (optional)

A backend service has no user token, so the Dispatch service can read `GET /orders/ready-for-dispatch` with a shared
key in an `X-Service-Key` header. Set it with the environment variable **`ORDER_SERVICE_API_KEY`**:

```powershell
# generate one (at least 32 characters) and keep it out of git
$env:ORDER_SERVICE_API_KEY = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

- Empty or unset (the default) switches the feature off; a value shorter than 32 characters stops the service at startup.
- The key opens **only** that one endpoint. Details and what Dispatch must send: [docs/dispatch-contract.md](docs/dispatch-contract.md).
- For several services to share it, put the same value in each service's environment. This repo does not set it in
  `infrastructure/dev`, so nothing there needs to change.

## Run locally against the local PostgreSQL

```powershell
cd services/order-service
$env:SPRING_DATASOURCE_URL      = "jdbc:postgresql://localhost:5437/order_db"
$env:SPRING_DATASOURCE_USERNAME = "admin"
$env:SPRING_DATASOURCE_PASSWORD = "<local postgres password>"
$env:JWT_SECRET                 = "<a random secret of at least 32 characters>"
Remove-Item Env:FLYWAY_DB_URL -ErrorAction SilentlyContinue   # make sure Flyway does not target Neon
mvn spring-boot:run
```

Call it with a throwaway token (see `scripts/new-dev-token.ps1`):

```powershell
$token = ./scripts/new-dev-token.ps1 -UserId 42        # uses $env:JWT_SECRET
Invoke-RestMethod http://localhost:8083/api/v1/orders -Method Post -Headers @{ Authorization = "Bearer $token" } `
  -ContentType 'application/json' -Body (@{
    pickupAddress='45 Galle Road, Colombo 03'; pickupContactName='Nuwan Pradeep'; pickupContactPhone='+94771234567'
    dropoffAddress='12/4 Peradeniya Road, Kandy'; dropoffContactName='Ayesha Perera'; dropoffContactPhone='0718849201'
    parcelSize='MEDIUM'; weightKg=1.5 } | ConvertTo-Json)
```

## Pricing

`fee = base + extra weight x rate + distance x rate + (different district ? zone surcharge : 0)`, all rounded half-up to
2 decimals, configured under `swiftdrop.pricing.*`. Distance is the straight line between the two chosen towns.
The formula, rates (currently **placeholders**), size limits and worked examples are in
[docs/pricing.md](docs/pricing.md). The town list (`src/main/resources/locations/cities.csv`) has hand-drafted
coordinates that must be verified before production use.

## Branch assignment

When an order is created, this service asks the Organization service which branch handles the **pickup town**
(`POST /api/v1/branches/resolve` with the town centre's latitude and longitude: the Organization service keeps the
active service areas covering that point and returns the nearest branch by the Haversine distance) and stores the
answer as `branch_id`. It is returned as `branchId`, sent in `order.delivery.created.v1`, and can be used to filter
`GET /orders/ready-for-dispatch?branchId=`.

| Organization service answers | Result |
|---|---|
| a branch | the order is created with that `branchId` |
| `422` (no service area covers the pickup) | `422` "We do not collect parcels from this pickup area yet"; no order |
| down, timeout, or an unexpected answer | `503` "Please try again shortly"; no order (an order without a branch could not be dispatched) |

The call is made before the database transaction starts, so a slow Organization service never holds a database
connection, and a repeated request with the same `Idempotency-Key` returns the original order without asking again.

| Setting (environment variable) | Default | Meaning |
|---|---|---|
| `swiftdrop.organization.base-url` (`ORGANIZATION_SERVICE_URL`) | `http://localhost:8082` (`http://organization-service:8082` under the `docker` profile, which the compose files activate) | Where the Organization service is. |
| `swiftdrop.organization.branch-resolution-enabled` (`ORDER_BRANCH_RESOLUTION_ENABLED`) | `true` | `false` skips the call and stores orders without a branch. For local work without the Organization service only. |
| `swiftdrop.organization.connect-timeout-ms` / `read-timeout-ms` | `2000` / `5000` | Time allowed to connect / to wait for the answer. |

The town centre is used because an order carries a town, not street coordinates; a pickup near the edge of a service
area may therefore resolve differently than its exact address would.

## Events

Order creation publishes `order.delivery.created.v1` and every status change publishes `order.delivery.status-changed.v1`, both through a transactional outbox. See [docs/events.md](docs/events.md).

## Tests

```powershell
mvn test        # needs Docker running (PostgreSQL and RabbitMQ run in Testcontainers)
```

Coverage report: `target/site/jacoco/index.html` (JaCoCo). Test coverage areas: validation, ownership/authorization,
idempotency, tracking numbers, fee calculation, Flyway/Hibernate schema agreement, and the outbox-to-RabbitMQ flow.

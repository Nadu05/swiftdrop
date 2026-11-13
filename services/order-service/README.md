# Order Service

Owns delivery orders, parcel details, the official delivery status/history, tracking numbers and order events.
Port `8083`. Behind the gateway it is reached at `/api/v1/orders/**` (the gateway strips `/api/v1/orders` to `/orders`;
the controller serves both paths).

## API (implemented so far)

| Method & path | Auth | Description |
|---|---|---|
| `POST /api/v1/orders` | `CUSTOMER` | Create an order. Optional `Idempotency-Key` header (max 64 chars `A-Za-z0-9_.:-`): the same key returns the original order. |
| `GET /api/v1/orders` | `CUSTOMER` | List **your own** orders as a JSON array, newest first. Paging: `page` (from 0, default 0) and `size` (1-100, default 20); the total is in the `X-Total-Count` response header. |
| `GET /api/v1/orders/{id}` | `CUSTOMER` | Read one of **your own** orders. Someone else's order returns `404`. |

Not implemented yet (other branches): `POST /orders/quote`, public tracking, timeline, receipts.

Request fields: `pickupAddress`, `pickupContactName`, `pickupContactPhone`, `dropoffAddress`, `dropoffContactName`,
`dropoffContactPhone`, `parcelDescription?`, `parcelSize` (`SMALL|MEDIUM|LARGE|EXTRA_LARGE`), `weightKg`
(0.01 to 100, max 2 decimals), `deliveryInstructions?`. The customer id, fee, tracking number, branch and status are
**decided by the server**; any such fields in the body are ignored.

Errors always have `timestamp`, `status`, `error` and `message` (or `fieldErrors` for validation, `400`).
`401` no/invalid token, `403` wrong role, `404` not found or not yours, `409` conflict, `422` business rule.

## Authentication switch (testing stage)

Authentication is currently **OFF** by default (`swiftdrop.security.enabled: ${ORDER_AUTH_ENABLED:false}`):
no token is needed, and orders belong to customer `ORDER_DEV_CUSTOMER_ID` (default `1`), or to the customer in an
`X-Customer-Id` header (handy for trying the ownership rule with two customers). The header is **ignored** whenever
authentication is on. To restore JWT protection set `ORDER_AUTH_ENABLED=true` (and `JWT_SECRET`), or change the
default in `application.yml`. Do not deploy with authentication off.

## Security contract (to be confirmed with the Identity service)

JWT, HS256, signed with the shared `JWT_SECRET` (raw UTF-8 bytes). `sub` = numeric user id; claim `role` (override with
`JWT_ROLE_CLAIM`) = `CUSTOMER`. If `JWT_SECRET` is empty the service fails closed (every protected request is `401`).

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

`fee = base-fee + per-kg-fee * weightKg`, rounded HALF_UP to 2 decimals, configured under `swiftdrop.pricing.*`.
**Interim placeholder values** until the agreed formula is delivered in `feature/order-fee-calculation`.

## Events

Order creation publishes `order.delivery.created.v1` through a transactional outbox. See [docs/events.md](docs/events.md).

## Tests

```powershell
mvn test        # needs Docker running (PostgreSQL and RabbitMQ run in Testcontainers)
```

Coverage report: `target/site/jacoco/index.html` (JaCoCo). Test coverage areas: validation, ownership/authorization,
idempotency, tracking numbers, fee calculation, Flyway/Hibernate schema agreement, and the outbox-to-RabbitMQ flow.

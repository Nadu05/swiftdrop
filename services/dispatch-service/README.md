# SwiftDrop Dispatch Service

Responsible for courier availability calculation, unassigned delivery filtering, parcel-to-courier assignment creation, concurrency-safe capacity enforcement, courier reassignment, delivery lifecycle transitions, and transactional outbox event publishing.

## Architecture Overview

- **Framework**: Java 21, Spring Boot 3.2.5, Spring Data JPA / Hibernate
- **Database & Migrations**: PostgreSQL 17, Flyway
- **Messaging**: RabbitMQ (`TopicExchange` + `Jackson2JsonMessageConverter` + Transactional Outbox)
- **Port**: `8084`
- **API Gateway Route**: `/api/v1/dispatch/**` with `StripPrefix=3`

Package layout under `com.swiftdrop.dispatch`:

- `controller/` — REST endpoints with dual mapping (`/api/v1/dispatch/...` and Gateway-stripped `/...`)
- `service/` — transactional business logic (`CourierService`, `UnassignedDeliveryService`, `AssignmentService`, `OutboxPublisherService`)
- `repository/` — Spring Data JPA repositories with JPQL fetch joins and pessimistic row locking (`findByIdForUpdate`)
- `entity/` & `entity/enums/` — JPA domain models (`Courier`, `Assignment`, `AssignmentHistory`, `OutboxEvent`, `TestItem`)
- `dto/` — explicit request/response contracts (no Lombok)
- `client/` — `OrderServiceClient` (`RestClient` HTTP integration)
- `event/` — domain event envelope (`DispatchEvent<T>`) and payload DTOs
- `config/` — `RabbitMQConfig`, `OpenApiConfig`
- `exception/` — `GlobalExceptionHandler` mapping domain exceptions to standardized JSON errors

## Database Schema (Flyway)

Migrations live in `src/main/resources/db/migration/`:

1. `V1__create_test_items.sql` — baseline `test_items` infrastructure verification table.
2. `V2__create_couriers_and_assignments.sql`:
   - `couriers` — courier code, optional `user_id` link, vehicle type (`MOTORCYCLE`, `VAN`, `BICYCLE`), status (`AVAILABLE`, `BUSY`, `OFFLINE`), `branch_id`, `max_capacity`.
   - `assignments` — order-to-courier allocation with partial unique index `uq_assignments_active_order` on `(order_id) WHERE status IN ('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT')`.
   - `assignment_history` — immutable chronological audit log with `ON DELETE RESTRICT` foreign keys.
3. `V3__create_outbox_events.sql` — `outbox_events` table storing serialized `DispatchEvent` payloads with `uq_outbox_event_id` unique constraint and status check (`PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`, `DEAD_LETTER`).

## API Endpoints

OpenAPI spec & Swagger UI: `/api-docs` and `/swagger-ui.html`.

| Method | Path (Direct / Gateway-Stripped) | Description | Auth Headers |
| --- | --- | --- | --- |
| `GET` | `/health` | Service health check | Public |
| `GET` | `/api/v1/dispatch/unassigned` (`/unassigned`) | List unassigned orders eligible for dispatch (`branchId`, `limit`) | Dispatcher (pending Gateway JWT) |
| `GET` | `/api/v1/dispatch/couriers/availability` (`/couriers/availability`) | List couriers with eligibility & workload (`status`, `branchId`) | Dispatcher (pending Gateway JWT) |
| `GET` | `/api/v1/dispatch/couriers/{id}/availability` (`/couriers/{id}/availability`) | Single courier availability & capacity | Dispatcher (pending Gateway JWT) |
| `POST` | `/api/v1/dispatch/assignments` (`/assignments`) | Assign a courier to an order | Dispatcher (pending Gateway JWT) |
| `GET` | `/api/v1/dispatch/assignments` (`/assignments`) | Filter assignments (`courierId`, `branchId`, `status`, `orderId`) | Dispatcher (pending Gateway JWT) |
| `GET` | `/api/v1/dispatch/assignments/my-assignments` (`/assignments/my-assignments`) | List assignments for the authenticated courier | Required `X-User-Id` |
| `GET` | `/api/v1/dispatch/assignments/{id}` (`/assignments/{id}`) | Get assignment by ID | Authenticated |
| `GET` | `/api/v1/dispatch/assignments/{id}/history` (`/assignments/{id}/history`) | Chronological reassignment/status audit trail | Dispatcher (pending Gateway JWT) |
| `PATCH` | `/api/v1/dispatch/assignments/{id}` (`/assignments/{id}`) | Reassign active delivery to another courier | Optional `X-User-Id` audit header |
| `PATCH` | `/api/v1/dispatch/assignments/{id}/status` (`/assignments/{id}/status`) | Transition delivery status (`ACCEPTED`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `CANCELLED`) | Required `X-User-Id` & `X-User-Role` (`COURIER`, `DISPATCHER`, `ADMIN`) |

### Example Payloads

**Create Assignment (`POST /api/v1/dispatch/assignments`)**

```json
{
  "orderId": 101,
  "courierId": 5
}
```

**Reassign Courier (`PATCH /api/v1/dispatch/assignments/10`)**

```json
{
  "courierId": 8,
  "reason": "Original courier vehicle breakdown"
}
```

**Update Delivery Status (`PATCH /api/v1/dispatch/assignments/10/status`)**

```json
{
  "status": "FAILED",
  "notes": "Recipient unreachable after 3 call attempts"
}
```

## Core Business Rules & Concurrency Guarantees

- **Eligibility**: Only `AVAILABLE` couriers with active assignments (`ASSIGNED`, `ACCEPTED`, `IN_TRANSIT`) strictly less than `maxCapacity` are eligible.
- **Concurrency Safety**: Assignment creation and reassignment lock the target `Courier` row (`SELECT ... FOR UPDATE`), recalculate workload inside the transaction, and rely on PostgreSQL partial unique index `uq_assignments_active_order` to guarantee at most one active assignment per `orderId`.
- **Lifecycle State Machine**:
  - `ASSIGNED` -> `ACCEPTED`, `CANCELLED`, `REASSIGNED`
  - `ACCEPTED` -> `IN_TRANSIT`, `CANCELLED`, `REASSIGNED`
  - `IN_TRANSIT` -> `DELIVERED`, `FAILED`, `REASSIGNED`
  - `DELIVERED`, `CANCELLED`, `FAILED`, `REASSIGNED` are terminal (reassignment returns HTTP `400`).
- **Failure Reason**: Transitioning an assignment to `FAILED` requires non-blank `notes` (returns HTTP `400` otherwise).
- **Courier Ownership**: When `X-User-Role` is `COURIER`, status updates verify the target assignment belongs to the courier resolved from `X-User-Id` (returns HTTP `403` on mismatch).

## RabbitMQ Events

- **Exchange**: `swiftdrop.events` (Topic)
- **Queue / Binding**: `dispatch.events.queue` bound to `dispatch.#`
- **Delivery Guarantee**: Events are stored in `outbox_events` inside the business transaction via `OutboxPublisherService`, published immediately if the broker is reachable, and retried every 5 seconds by the `@Scheduled` poller up to `max_retries` (`5`) before moving to `DEAD_LETTER`.

| Event Type | Routing Key | Payload Data Fields |
| --- | --- | --- |
| `dispatch.courier.assigned` | `dispatch.courier.assigned.v1` | `assignmentId`, `orderId`, `courierId`, `branchId`, `status` |
| `dispatch.courier.reassigned` | `dispatch.courier.reassigned.v1` | `assignmentId`, `orderId`, `previousCourierId`, `newCourierId`, `branchId`, `status`, `reason`, `changedBy` |
| `dispatch.delivery.status.changed` | `dispatch.delivery.status.changed.v1` | `assignmentId`, `orderId`, `courierId`, `previousStatus`, `newStatus`, `changedBy`, `notes` |

## Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `SERVER_PORT` | No | `8084` | HTTP server port |
| `NEON_HOST` | Yes | — | PostgreSQL host |
| `NEON_USER` | Yes | — | Database username |
| `NEON_PASSWORD` | Yes | — | Database password |
| `FLYWAY_DB_URL` | No | `${spring.datasource.url}` | Override URL for Flyway migrations |
| `FLYWAY_DB_USER` | No | `${spring.datasource.username}` | Override Flyway username |
| `FLYWAY_DB_PASSWORD` | No | `${spring.datasource.password}` | Override Flyway password |
| `RABBITMQ_HOST` | No | `localhost` | RabbitMQ broker hostname |
| `RABBITMQ_PORT` | No | `5672` | RabbitMQ AMQP port |
| `RABBITMQ_USER` | No | `swiftdrop` | RabbitMQ username |
| `RABBITMQ_PASSWORD` | Yes | — | RabbitMQ password (no hardcoded secret fallback) |
| `ORDER_SERVICE_URL` | No | `http://localhost:8083` | Base URL for `OrderServiceClient` |
| `ORDER_VERIFY_ON_ASSIGNMENT` | No | `false` | Enables `GET /api/v1/orders/{id}` verification before creating an assignment |

## Running Locally & Testing

```bash
# Compile
mvn -o test-compile -f services/dispatch-service/pom.xml

# Run unit, controller, JPA repository, and H2 concurrency tests
mvn -o clean test -f services/dispatch-service/pom.xml
```

## Known Cross-Service Dependencies (Pending Other Team Members)

- **Identity Service & API Gateway (Member 01)**: JWT signature validation, role enforcement, and trusted header injection/stripping (`X-User-Id`, `X-User-Role`) are not yet implemented in `identity-service` or `api-gateway`. Dispatcher endpoints rely on Gateway/Security enforcement once available.
- **Order Service (Member 05)**: `OrderServiceClient` targets `GET /api/v1/orders/ready-for-dispatch` and `GET /api/v1/orders/{id}`, which are not yet implemented in `order-service`. Set `ORDER_VERIFY_ON_ASSIGNMENT=true` once live.
- **Notification Service (Member 08)**: Consumers for `dispatch.courier.assigned.v1`, `dispatch.courier.reassigned.v1`, and `dispatch.delivery.status.changed.v1` will be wired once downstream listeners are ready.


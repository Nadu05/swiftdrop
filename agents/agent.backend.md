# SwiftDrop Backend Agent Guidelines

**File:** `agent.backend.md`\
**Purpose:** Give AI coding agents and developers a single,
authoritative guide to SwiftDrop's backend architecture, service
boundaries, technology choices, coding standards, integration contracts,
and safe implementation workflow.

> **Rule for coding agents:** Read this document before changing backend
> code. Treat the existing repository, build files, migrations, API
> contracts, and tests as the implementation source of truth. If they
> conflict with this guide, do not silently make a broad architectural
> change: explain the conflict and propose the smallest safe resolution.

------------------------------------------------------------------------

## 1. Project overview

SwiftDrop is a delivery-management platform for customers, merchants,
branch staff, dispatchers, couriers, and administrators. It supports
delivery creation, branch selection, courier assignment, delivery
tracking, proof of delivery, merchant integrations, and notifications.

### Main technology choices

  -----------------------------------------------------------------------
  Area                                Standard
  ----------------------------------- -----------------------------------
  Backend services                    Java with Spring Boot

  API gateway                         Spring Cloud Gateway

  Frontend (outside backend scope)    Next.js with TypeScript

  Service APIs                        REST/JSON; document with OpenAPI

  Databases                           PostgreSQL, one independently owned
                                      database per microservice

  Database hosting                    Neon PostgreSQL for the current
                                      environment; use environment
                                      variables for connection settings

  Asynchronous messaging              RabbitMQ

  Event exchange                      `swiftdrop.events` (topic exchange)

  Containers/local orchestration      Docker and Docker Compose

  API entry point                     API Gateway, normally port `8080`

  Frontend development port           `3000`

  Service health                      Spring Boot Actuator health
                                      endpoints
  -----------------------------------------------------------------------

The five core backend microservices are **Identity**, **Organization**,
**Order**, **Dispatch**, and **Notification**. The API Gateway is an
edge component, not a sixth domain microservice. The frontend is not a
backend service.

### Architecture principles

1.  Each microservice owns its domain logic, data model, database
    schema, migrations, and public contracts.
2.  A service must never read from or write to another service's
    database directly.
3.  Use REST for operations that need an immediate answer; use RabbitMQ
    domain events for asynchronous propagation and workflows.
4.  Do not duplicate another service's authoritative business rules.
5.  Prefer small, reviewable changes that fit the current architecture
    over unnecessary rewrites or new dependencies.
6.  Keep credentials, tokens, connection strings, and personally
    identifiable data out of source control and logs.
7.  Make failures observable, recoverable, and testable.

------------------------------------------------------------------------

## 2. Microservice boundaries and ownership

### 2.1 Identity Service

**Owns** - User account records and account lifecycle. - Authentication
and identity-related operations. - Roles, permissions, and role-to-user
assignments. - Credential validation and password hashing where local
credentials are used. - API-client credentials or API-key lifecycle,
subject to the agreed merchant integration design. - Identity-related
security metadata, account status, and authorization checks.

**Does not own** - Branch structures, service areas, or merchant
approval decisions. - Delivery requests, parcel lifecycle, dispatch
assignments, or notification delivery. - Business data belonging to
another service.

**Responsibilities** - Provide secure registration/login and
authenticated identity endpoints. - Support role-based access control
for customers, merchants, couriers, branch staff, dispatchers, and
administrators. - Validate authorization at protected endpoints; never
rely only on frontend route hiding. - Store password hashes using an
established secure password-hashing implementation. Never store
plaintext passwords. - Keep tokens, secrets, and API credentials out of
logs and API responses. - Define clear rules for user identity
references used by other services. Other services may store the identity
ID as a reference, not copy the identity database.

**Agent boundary rule:** Do not implement merchant approval or branch
membership rules here. Identity establishes *who the caller is*; domain
services decide *what that identity may do in their domain*.

### 2.2 Organization Service

**Owns** - Head Office and branch hierarchy. - Branch records,
addresses, coordinates, and operational status. - Branch staff
membership/assignment to organizational units where applicable. -
Service areas or delivery zones and the rules/data needed to identify an
eligible branch. - Merchant/business profile, onboarding details, and
registration approval/rejection workflow. - Organization-specific
settings and branch-level configuration.

**Does not own** - User authentication/passwords. - The authoritative
delivery/order record or official delivery status history. - Courier
delivery assignments and proof-of-delivery records. - Email sending or
webhook retry execution.

**Responsibilities** - Maintain the organizational hierarchy and branch
information. - Support merchant onboarding, review, approval, rejection,
and status changes. - Expose a documented way for authorized services to
resolve eligible branches from pickup location/service-area rules. -
Validate that branch and merchant references exist and are active when
relevant. - Publish organization/merchant lifecycle events when other
services need to react asynchronously.

**Agent boundary rule:** Merchant approval belongs here. Authentication
and API-client credential verification belong to Identity; merchant
delivery orders belong to Order. Do not treat a merchant as approved
merely because a user account exists.

### 2.3 Order Service

**Owns** - Customer delivery requests and delivery/order records. -
Parcel details such as size, weight, pickup, drop-off, and delivery
instructions. - Delivery pricing/fee calculation and the quote returned
before confirmation, using documented pricing rules and
organization-provided configuration where required. - Public tracking
number and customer-visible delivery history. - The **authoritative
delivery lifecycle and official status history**. - Merchant order
submission and merchant-facing order/query functionality, subject to the
integration contract. - Order-related validation, cancellation rules,
receipts, and order-facing API contracts.

**Does not own** - Authentication credentials or merchant approval
workflow. - The canonical branch hierarchy and service-area
configuration. - Courier availability, workload, or assignment
records. - Sending emails or executing/retrying outbound merchant
webhooks.

**Responsibilities** - Validate delivery request data and
calculate/return an estimate before the customer confirms. - Create
orders only after required validation and authorization. - Request
branch resolution from Organization using a documented REST contract or
a well-defined integration event; do not query Organization's
database. - Maintain the official delivery status and append
status-history records for every valid transition. - Provide a public
tracking endpoint that exposes only the minimum information safe for
unauthenticated access. - Support authorized merchant order creation and
status/history queries; ensure the caller's merchant identity is
authorized for the requested data. - Emit versioned events when an order
is created or its official status changes. - Make create/confirm
operations safe against accidental duplicate requests where appropriate
(idempotency key or equivalent documented mechanism).

**Status ownership:** Order is the source of truth for the official
delivery lifecycle. Dispatch reports operational facts (for example,
pickup completed, delivery attempted, or proof recorded) through a
defined REST command or event contract. Order validates whether the
corresponding official status transition is allowed and records the
authoritative status.

**Agent boundary rule:** Do not move official status ownership to
Dispatch, Notification, the Gateway, or the frontend.

### 2.4 Dispatch Service

**Owns** - Courier operational profiles and availability, where not part
of Identity's login identity. - Courier workload and operational
capacity. - Assignment of deliveries to branches/couriers and
reassignment rules. - Dispatch queues and operational assignment
state. - Courier-facing assigned-delivery views. - Operational delivery
actions, notes, failure reasons, recipient confirmation, and
proof-of-delivery metadata or file references. - Dispatch-side records
needed to coordinate pickup, transit, delivery attempts, and assignment
completion.

**Does not own** - Login credentials and global roles. - Branch
hierarchy or merchant approval. - The authoritative order record or
official status history. - Email/in-app notification delivery or webhook
retry processing.

**Responsibilities** - Provide authorized dispatchers/admins with
unassigned work and courier workload information. - Support
assignment/reassignment with validation of courier availability and
relevant branch/operational constraints. - Give couriers access only to
their authorized assignments. - Record delivery attempts and
proof-of-delivery metadata securely. Avoid logging sensitive proof
details. - Notify Order of operational milestones through a documented
command/event contract so Order can validate and update the official
lifecycle. - Consume order-created/ready-for-dispatch events where
asynchronous dispatch workflows are used. - Handle duplicate events and
repeated status submissions idempotently.

**Agent boundary rule:** Dispatch owns operational execution and
assignments; Order owns the official customer-facing order state. Avoid
two independently editable "official status" fields.

### 2.5 Notification Service

**Owns** - Notification preferences and templates. - In-app/email
notification records and delivery attempts. - Notification provider
integration and delivery outcomes. - Merchant webhook endpoint
configuration, delivery attempts, retry schedule, and webhook logs, if
webhook delivery is enabled. - Failure handling, retry metadata, and
dead-letter operational visibility for notification work.

**Does not own** - The authoritative order status. - User
authentication, branch hierarchy, order creation, or courier
assignment. - The source-of-truth merchant approval decision.

**Responsibilities** - Consume relevant events from RabbitMQ and send
appropriate notifications. - Support notifications for order creation,
status changes, assignment/delivery milestones, and merchant onboarding
outcomes where required. - Execute merchant webhooks asynchronously for
subscribed events. - Use bounded retries with backoff and dead-letter
handling; record enough metadata to diagnose failures without storing
secrets or full sensitive payloads. - Make event handling idempotent so
redelivery does not produce avoidable duplicate notifications. - Keep
provider credentials in environment variables/secrets, never in
templates or source code.

**Agent boundary rule:** Notification reacts to domain events. It must
not change an order's status to make a notification succeed or fail.

### 2.6 API Gateway

**Owns** - External routing to backend services. - Edge-level CORS
policy, request-size limits where appropriate, and cross-cutting edge
configuration. - Gateway-level authentication integration only where
explicitly designed and consistently enforced. - Forwarding
trace/correlation headers and safe edge-level observability.

**Does not own** - Domain business logic, pricing, branch selection,
merchant approval, delivery status transitions, or persistence of domain
records. - Direct access to service databases. - Complex orchestration
that belongs to a domain service.

**Responsibilities** - Route frontend/client requests to the correct
service. - Use environment-based route configuration where
appropriate. - Apply consistent CORS settings for known frontend
origins; do not use wildcard origins with credentials. - Preserve or
generate a correlation ID and propagate it to downstream services. -
Return consistent, safe errors without exposing stack traces or
secrets. - Keep service health/management endpoints private or
appropriately restricted in non-development environments.

### 2.7 Frontend boundary

The Next.js frontend is a client of the backend, not a trusted
enforcement layer. It must use the Gateway for normal external API
traffic and must not connect directly to PostgreSQL or RabbitMQ. The
backend must independently validate input, identity, permissions,
ownership, and state transitions.

------------------------------------------------------------------------

## 3. Cross-service ownership rules

  -----------------------------------------------------------------------
  Concern                 Owner                   Other services' allowed
                                                  interaction
  ----------------------- ----------------------- -----------------------
  User accounts,          Identity                Call documented API or
  authentication, roles,                          validate signed
  credentials                                     identity claims under
                                                  the agreed security
                                                  design

  Branches, service       Organization            Call documented
  areas, organization                             Organization API or
  hierarchy                                       consume its events

  Merchant registration   Organization            Identity authenticates
  approval                                        the merchant user;
                                                  Notification sends the
                                                  outcome

  Merchant API client     Identity                Order uses the verified
  credentials                                     client/merchant
                                                  identity

  Delivery request,       Order                   Dispatch receives the
  pricing quote, parcel,                          minimum required order
  tracking number                                 data via API/event

  Official delivery       Order                   Dispatch submits
  status/history                                  operational facts;
                                                  Notification consumes
                                                  status events

  Courier availability    Dispatch                Order/Organization
  and assignment                                  integration uses
                                                  documented APIs/events

  Proof of delivery and   Dispatch                Order receives the
  delivery attempt                                relevant
  metadata                                        milestone/reference

  Email/in-app            Notification            Other services publish
  notification and                                domain events
  outbound webhook                                
  attempts                                        

  External route/CORS     API Gateway             Gateway forwards
  configuration                                   requests; no domain
                                                  ownership
  -----------------------------------------------------------------------

When a feature crosses boundaries, keep the authoritative write in the
owning service and communicate through an explicit API or event. Do not
create a "shared database" shortcut.

------------------------------------------------------------------------

## 4. Inter-service communication standard

### 4.1 Synchronous REST

Use REST/JSON when the caller needs an immediate response, such as: -
Frontend → Gateway → owning service. - Order → Organization for
branch/service-area resolution when an immediate answer is required. -
Service-to-service validation that genuinely requires a current
response.

Standards: - Define and maintain an OpenAPI contract for each externally
consumed API. - Use resource-oriented URLs, appropriate HTTP methods,
and meaningful status codes. - Set connection/read timeouts for every
outbound HTTP call. - Do not retry non-idempotent writes automatically
unless idempotency is guaranteed. - Propagate correlation IDs and use
service credentials for internal endpoints. - Avoid long synchronous
chains. If an operation can be asynchronous, consider an event-driven
workflow. - Return DTOs, not persistence entities. - Keep internal
service URLs/configuration in environment variables rather than
hard-coded hostnames.

### 4.2 RabbitMQ domain events

Use RabbitMQ for asynchronous propagation and decoupled workflows,
particularly delivery lifecycle events and notifications.

-   Exchange: `swiftdrop.events`.
-   Exchange type: `topic`.
-   Routing keys must be descriptive, lowercase, dot-separated, and
    versioned.
-   Suggested routing-key pattern:
    `<domain>.<entity>.<event>.v<version>`.
-   Example keys: `order.delivery.created.v1`,
    `order.delivery.status-changed.v1`, `dispatch.courier.assigned.v1`,
    `organization.merchant.approved.v1`.
-   Use durable exchanges/queues and persistent messages for
    business-critical events.
-   Each consumer owns its queue and binding; do not let one service
    read another service's database as a substitute for consuming
    events.
-   Include an event ID, event type/version, occurrence timestamp,
    producer, correlation ID, and the minimum required payload.
-   Use JSON schemas/DTOs with explicit compatibility rules. Do not
    rename/remove fields in a breaking way without versioning or a
    migration plan.
-   Consumers must acknowledge only after successful processing and must
    handle duplicate delivery safely.
-   Configure bounded retries with backoff and a dead-letter queue
    (DLQ). Avoid infinite immediate requeue loops.
-   Keep broker credentials private; do not expose RabbitMQ management
    or AMQP ports publicly in production.
-   Use a transactional outbox for events that must not be lost between
    a database commit and message publication. If the outbox is not
    implemented yet, document the delivery guarantee and do not claim
    atomic publish-and-save behavior.

### 4.3 Event ownership and examples

  -------------------------------------------------------------------------------------------
  Event                                       Producer / owner        Typical consumers
  ------------------------------------------- ----------------------- -----------------------
  `organization.merchant.submitted.v1`        Organization            Notification, if a
                                                                      submission alert is
                                                                      needed

  `organization.merchant.approved.v1`         Organization            Notification,
                                                                      Identity/Order only if
                                                                      required by explicit
                                                                      workflow

  `order.delivery.created.v1`                 Order                   Dispatch, Notification

  `dispatch.courier.assigned.v1`              Dispatch                Order (to
                                                                      validate/update
                                                                      official lifecycle if
                                                                      appropriate),
                                                                      Notification

  `dispatch.delivery.milestone-reported.v1`   Dispatch                Order

  `order.delivery.status-changed.v1`          Order                   Notification and other
                                                                      authorized subscribers

  `notification.webhook.delivery-failed.v1`   Notification            Monitoring/operations
                                                                      consumers, if
                                                                      implemented
  -------------------------------------------------------------------------------------------

These names are conventions/examples. Before adding an event, inspect
existing contracts and reuse the established name and payload where
possible. Do not create duplicate events that express the same fact.

### 4.4 Event payload guidance

An event should carry only what consumers need. Prefer IDs and stable
business facts over copying whole database records. Never include
passwords, access tokens, API secrets, unnecessary personal data, or raw
proof-of-delivery media. Use references for large files and sensitive
artefacts.

Example shape (illustrative, not a mandatory schema):

``` json
{
  "eventId": "uuid",
  "eventType": "order.delivery.created",
  "eventVersion": 1,
  "occurredAt": "2026-01-01T10:00:00Z",
  "producer": "order-service",
  "correlationId": "uuid",
  "data": {
    "deliveryId": "uuid",
    "trackingNumber": "public-tracking-code",
    "branchId": "uuid"
  }
}
```

------------------------------------------------------------------------

## 5. Database and persistence rules

1.  Each service has its own PostgreSQL database and separate
    credentials. Current environment uses Neon; connection strings must
    be supplied through environment variables.
2.  Never commit real database URLs, passwords, API keys, signing
    secrets, or provider credentials.
3.  Never connect one service to another service's database, even for
    read-only queries.
4.  Each service owns its schema, migrations, indexes, constraints, and
    persistence entities.
5.  Use the migration mechanism already established in that service (for
    example, Flyway or Liquibase). Do not introduce a second migration
    framework without approval.
6.  Schema changes must be committed as migrations; do not rely on
    manual production database edits.
7.  Prefer UUIDs or the repository's established ID convention
    consistently. Do not change existing ID formats casually.
8.  Use foreign keys for relationships inside a service's database.
    Across services, store external IDs as references and validate
    through contracts/events.
9.  Use transactions for invariants within one service/database. Do not
    attempt distributed database transactions across microservices.
10. Use pagination for list endpoints that may grow. Add indexes for
    actual query patterns and inspect query plans for expensive queries.
11. Store timestamps consistently (prefer UTC/`Instant` at service
    boundaries) and document timezone behavior for customer-facing
    display.
12. Use decimal-safe numeric types for money; never use floating-point
    types for currency. Document currency and rounding rules.
13. Treat the current Neon databases as an empty initial environment. Do
    not invent or depend on seed business records. If local development
    requires seed data, create explicit, repeatable, non-production seed
    scripts.
14. Do not delete, recreate, or reset a database as a routine
    development step. Destructive operations require explicit user
    approval and a clear target/environment check.

------------------------------------------------------------------------

## 6. Backend coding standards

### 6.1 Java and Spring Boot

-   Follow the Java version and Spring Boot version already defined in
    the repository's build configuration. Do not upgrade versions
    casually.
-   Use constructor injection; avoid field injection.
-   Keep controllers thin: HTTP mapping, request validation, response
    mapping, and delegation only.
-   Put business rules in service/domain classes, not controllers or
    repositories.
-   Keep persistence access in repository classes.
-   Use DTOs for request/response payloads; do not expose JPA entities
    directly.
-   Use explicit validation (`jakarta.validation` annotations and/or
    domain validation) at API boundaries.
-   Use clear, domain-specific names. Avoid generic classes such as
    `CommonManager` or `Utils` that accumulate unrelated logic.
-   Prefer small methods and cohesive classes. Follow existing package
    conventions in each service.
-   Use enums/value objects for constrained domain concepts where
    appropriate; avoid arbitrary status strings.
-   Keep configuration externalized using `application.yml` and
    environment variables. Never hard-code secrets or production
    hostnames.
-   Avoid unnecessary dependencies. Check whether the repository already
    has a suitable library before adding one.
-   Use JavaDoc/comments to explain non-obvious decisions, invariants,
    and public contracts---not to restate obvious code.
-   Use structured logging with useful identifiers (service,
    request/correlation ID, entity ID). Do not log credentials, tokens,
    full payment details, or sensitive personal data.
-   Map exceptions centrally and return a consistent error response. Do
    not expose stack traces to clients.
-   Use explicit transaction boundaries for multi-step operations that
    must be atomic within a service.
-   Use UTC-aware time types and deterministic clocks where tests need
    time control.

### 6.2 Suggested internal layering

Follow the existing repository layout if one is already established.
Otherwise, use a simple structure such as:

``` text
controller/       HTTP endpoints and request mapping
dto/              Request/response DTOs and API contracts
service/          Use cases and business logic
domain/           Domain rules and value objects, when justified
repository/       Database access
entity/           Persistence models
mapper/           DTO/entity mapping, if mapping is non-trivial
messaging/        Event publishers, consumers, and event DTOs
config/           Spring and infrastructure configuration
exception/        Domain exceptions and API error mapping
```

Do not create every folder or abstraction mechanically for a tiny
feature. Keep the design proportional to the complexity.

### 6.3 REST API conventions

-   Use plural resource names and predictable URL structure, consistent
    with the existing API.
-   Use `GET` for reads, `POST` for creation/commands, `PUT` for full
    replacement, and `PATCH` for partial updates where appropriate; use
    `DELETE` only where the domain permits deletion.
-   Validate request bodies, path parameters, query parameters, and
    ownership.
-   Return correct HTTP status codes (for example, `201 Created` for
    resource creation, `400` for invalid input, `401` for
    unauthenticated requests, `403` for forbidden actions, `404` for
    absent/hidden resources, `409` for conflicts, and `5xx` for
    unexpected server errors).
-   Keep response/error formats consistent within and across services.
-   Add pagination and stable sorting to potentially large collection
    endpoints.
-   Document authentication, roles/permissions, validation errors, and
    examples in OpenAPI.
-   Do not leak internal database IDs or fields in public tracking
    responses unless explicitly required.

### 6.4 Validation and business invariants

-   Validate at the boundary and enforce critical invariants again in
    the owning domain/service.
-   Validate that referenced records are valid through the owning
    service's API or a trustworthy, appropriately designed event-derived
    projection.
-   Never trust role, merchant ID, customer ID, courier ID, or branch ID
    supplied by a client without checking the authenticated caller's
    authority.
-   Enforce allowed delivery status transitions in Order.
-   Reject invalid transitions rather than silently forcing a status.
-   Use idempotency for retryable commands where duplicate execution
    would create duplicate orders, assignments, or external effects.
-   Do not treat a successful event publish as proof that all consumers
    completed their work.

------------------------------------------------------------------------

## 7. Security requirements

-   Enforce authentication and authorization on the backend, not only in
    the UI.
-   Apply least privilege: users, service accounts, database users, and
    broker credentials should have only the permissions they need.
-   Use a consistent authentication mechanism across services, as
    established by the repository. Validate token signature, issuer,
    audience, and expiry where applicable.
-   Never invent a new token format or bypass existing security filters
    to make a test pass.
-   Hash passwords with a reputable adaptive password-hashing algorithm
    supported by the chosen framework.
-   Store API keys as hashes when feasible; show a newly generated
    secret only when it is created, and support rotation/revocation.
-   Require merchant approval and appropriate merchant
    identity/permissions before merchant order submission.
-   Prevent insecure direct object references: a customer can access
    only their own deliveries, a merchant only its authorized orders,
    and a courier only assigned deliveries.
-   Validate webhook URLs and defend against server-side request forgery
    (SSRF): restrict schemes, private/link-local destinations,
    redirects, and DNS rebinding as appropriate to the deployment.
-   Sign outbound webhooks (for example, HMAC with timestamp) if
    supported by the agreed contract; include replay-protection
    guidance.
-   Set request-size and upload constraints. Validate file types and
    store proof media outside database rows where appropriate.
-   Do not return internal exception messages, SQL details, secrets, or
    stack traces.
-   Use HTTPS for deployed environments. Local HTTP is for development
    only.
-   Keep actuator and infrastructure-management endpoints protected.
-   Add rate limiting or abuse controls to public tracking,
    authentication, and public-facing endpoints where required.

------------------------------------------------------------------------

## 8. Testing requirements

Every meaningful backend change must include appropriate tests.

### Minimum expectations

-   **Unit tests:** domain/service rules, pricing, authorization
    decisions, and state transitions.
-   **Web/controller tests:** request validation, status codes, response
    shape, and access control.
-   **Repository/integration tests:** persistence mappings, migrations,
    constraints, and transaction behavior.
-   **Messaging tests:** event serialization, routing/bindings where
    practical, duplicate handling, retry/DLQ behavior, and consumer
    idempotency.
-   **Contract tests:** REST DTO/OpenAPI compatibility and event payload
    compatibility for cross-service interactions.
-   **Regression tests:** reproduce the reported bug before or alongside
    the fix.

### Test rules

-   Use the test framework already present (normally JUnit 5 and Spring
    Boot testing tools in a Spring Boot service).
-   Tests must be deterministic and must not depend on real
    production/Neon data, live external providers, or developer-specific
    secrets.
-   Use isolated test databases/containers or the project's established
    test strategy.
-   Mock external HTTP providers and message brokers for unit tests; add
    integration tests for critical real integration behavior.
-   Test both allowed and denied authorization cases.
-   Test duplicate delivery of events and duplicate API requests for
    idempotent flows.
-   Do not weaken, delete, or skip an existing test simply to get a
    green build. Explain and justify any unavoidable test change.

Before finishing, run the most relevant tests and build for every
changed service. Report commands run and results honestly; do not claim
tests passed if they were not run.

------------------------------------------------------------------------

## 9. Error handling, observability, and reliability

-   Use a consistent error payload across APIs, preferably including a
    stable error code, safe message, timestamp, and correlation ID.
-   Log unexpected errors with stack traces on the server side, but
    return safe client messages.
-   Use structured logs and propagate correlation IDs across REST calls
    and RabbitMQ events.
-   Add health/readiness checks for application and required
    dependencies, without exposing sensitive configuration.
-   Configure timeouts on network calls and bounded retries with
    backoff.
-   Do not retry validation errors, authorization failures, or other
    permanent failures.
-   Avoid retry storms and cascading failures; consider circuit breaking
    where repeated dependency failures justify it and the project
    already supports it.
-   Make asynchronous failures visible through logs, metrics, DLQs, and
    notification/webhook attempt records.
-   Never swallow exceptions silently or acknowledge a business-critical
    event before its work is safely completed.
-   Keep health endpoints compatible with the Gateway and local
    health-check setup.

------------------------------------------------------------------------

## 10. Configuration, Docker, and environment management

-   Keep configuration in each service's existing `application.yml`,
    Dockerfile, Compose configuration, and documented environment
    variables.
-   Use `.env.example` with placeholder values only. Never put live
    credentials in `.env.example`, source code, build logs, or committed
    Compose files.
-   Ensure `.env`, local secret files, build output, and IDE files are
    appropriately ignored by Git.
-   For Neon, configure each service with its own database URL and
    least-privilege credentials. Do not share one service's credentials
    with another.
-   Do not add a local PostgreSQL container or startup script unless it
    is part of the currently agreed environment. Current database
    hosting is Neon; inspect current Compose files before changing
    infrastructure.
-   Do not expose database or RabbitMQ ports publicly in production.
-   Preserve service ports and Gateway routes unless the change
    explicitly requires a coordinated update.
-   Keep Docker images reproducible and avoid copying secrets into
    images or build layers.
-   Health checks should verify actual application readiness, not merely
    that a container process exists.
-   Ensure the documented local startup and shutdown commands continue
    to work after infrastructure changes.

------------------------------------------------------------------------

## 11. Merchant integration rules

Merchants are businesses that create delivery orders through the
SwiftDrop platform, either through an authorized dashboard/workflow or a
secured integration API.

### Onboarding and access

1.  Merchant submits business details through the onboarding flow.
2.  Organization records the application and an authorized administrator
    approves or rejects it.
3.  Identity manages authentication and the applicable API client
    credential lifecycle.
4.  Order accepts merchant order creation only from an authenticated,
    authorized, approved merchant.
5.  The backend must enforce merchant-to-order ownership on every
    read/update operation.

### Merchant order API

-   Document required fields, validation rules, authentication method,
    rate limits, error codes, and idempotency behavior.
-   Support API keys or OAuth 2.0 client credentials only according to
    the implemented and agreed security design; do not implement both as
    an undocumented shortcut.
-   Do not trust a `merchantId` in the request body as proof of
    identity. Derive or validate the merchant identity from the
    authenticated principal/client.
-   Validate pickup/drop-off details, parcel data, and supported service
    constraints.
-   Return a stable order/tracking reference and clearly documented
    response semantics.
-   Ensure duplicate submissions can be handled safely where the client
    retries after a timeout.

### Webhooks

-   Notification owns webhook delivery attempts, retries, and delivery
    logs.
-   Order owns the delivery state and publishes the state-change event.
-   Allow only documented event subscriptions.
-   Sign webhook deliveries if supported; include a timestamp/event ID
    and explain receiver-side verification.
-   Use bounded retries, backoff, and a DLQ or equivalent failure
    visibility.
-   Store webhook secrets securely and redact them from all logs and API
    responses.
-   Do not make the order-creation request wait for a merchant webhook
    to complete.

------------------------------------------------------------------------

## 12. Delivery lifecycle and business invariants

The customer-visible lifecycle currently includes:

`Created → Picked Up → In Transit → Out for Delivery → Delivered / Failed`

Treat this as the high-level workflow, not permission to accept
arbitrary transitions. Define the allowed transition matrix in Order and
test it. Include cancellation or reattempt transitions only when
supported by the documented scope.

-   Order owns the official status and status history.
-   Dispatch owns assignment and operational execution records.
-   Dispatch reports milestones/proof to Order through a defined
    contract.
-   Order validates the transition, persists the official
    status/history, and publishes `order.delivery.status-changed.v1`.
-   Notification consumes the resulting event and sends
    messages/webhooks.
-   A notification failure must not roll back a valid delivery status
    change.
-   Proof-of-delivery should record appropriate metadata (such as
    recipient confirmation, timestamp, note, and secure media reference)
    with access controls and retention rules.

Branch selection should use the Organization service's
branch/service-area data and a documented selection rule (for example,
eligible branch with minimum distance where the scope specifies that).
Do not invent a distance algorithm, fallback policy, or pricing formula
without documenting and testing the business rule.

------------------------------------------------------------------------

## 13. Agentic coding workflow

Every AI coding agent must follow this workflow.

### Step 1 --- Inspect before editing

-   Read this file and the repository README/architecture documentation.
-   Inspect the target service's build file, package layout,
    configuration, current controllers/services/repositories,
    migrations, tests, and Gateway routes.
-   Search for an existing implementation or contract before creating a
    new one.
-   Confirm the owning microservice and dependencies for the requested
    feature.
-   If a requirement crosses service boundaries or contradicts existing
    contracts, state the ambiguity and propose a minimal plan before
    making broad changes.

### Step 2 --- State a small implementation plan

Identify: - Owning service(s). - API/database/event changes. - Security
and authorization implications. - Backward compatibility concerns. -
Tests to add or update. - Configuration or documentation changes
required.

For small, unambiguous changes, proceed without unnecessary ceremony.
For destructive, cross-service, schema-breaking, or security-sensitive
changes, stop and obtain approval before making broad changes.

### Step 3 --- Implement within boundaries

-   Change only the necessary files and services.
-   Follow the established code style and dependency versions.
-   Reuse existing DTOs, exceptions, security helpers, event envelopes,
    and test patterns.
-   Do not add speculative features, unrelated refactors, new
    microservices, or new infrastructure.
-   Do not bypass validation/security to make an endpoint work.
-   Add migrations for schema changes.
-   Update API/event documentation when contracts change.
-   If an event or API changes, check all known producers, consumers,
    and frontend expectations.

### Step 4 --- Verify

-   Run formatting/lint checks if configured.
-   Run focused tests, then the full relevant service test/build.
-   Verify application configuration and startup/health behavior when
    relevant.
-   Check for accidental secrets, unrelated files, generated output, and
    destructive commands.
-   For cross-service changes, verify contract compatibility and test
    affected services where feasible.

### Step 5 --- Report accurately

At completion, summarize: 1. What changed and why. 2. Which
services/files were changed. 3. API, schema, event, or configuration
changes. 4. Tests/build commands run and their actual results. 5.
Remaining limitations or follow-up work.

Never claim a build, test, deployment, migration, or live integration
succeeded unless it was actually executed and verified.

------------------------------------------------------------------------

## 14. Changes requiring explicit approval

Do not perform these actions without explicit user approval: - Dropping,
resetting, or deleting a database, schema, or persistent volume. -
Running destructive migrations against shared/staging/production
environments. - Rotating/revoking live credentials or changing
production secrets. - Changing authentication/token design, permission
semantics, or public security posture. - Breaking REST or event
contracts used by other services. - Renaming services, changing
established ports/routes, or replacing RabbitMQ. - Introducing a new
microservice, database, broker, framework, or major dependency. -
Removing existing features/tests or broadly restructuring the
repository. - Deploying to production or running irreversible external
actions.

An empty initial database is not blanket permission for an agent to
repeatedly drop or recreate databases. Prefer forward migrations and
explicit setup scripts.

------------------------------------------------------------------------

## 15. Definition of done

A backend change is complete only when applicable items are satisfied:

-   [ ] Implemented in the correct owning service.
-   [ ] No cross-service database access or duplicated source-of-truth
    logic.
-   [ ] Request validation, authentication, authorization, and ownership
    checks are present.
-   [ ] API/event contracts and documentation are updated where
    necessary.
-   [ ] Schema changes use versioned migrations.
-   [ ] Errors, logs, correlation IDs, and failure behavior are
    appropriate.
-   [ ] Idempotency/retry behavior is considered for commands and
    events.
-   [ ] Relevant unit/integration/contract tests are added or updated.
-   [ ] Relevant tests/builds were run and results reported accurately.
-   [ ] No secrets or sensitive data were committed or logged.
-   [ ] No unrelated refactoring or unapproved destructive changes were
    made.
-   [ ] Required configuration, Docker, and developer documentation are
    updated.

------------------------------------------------------------------------

## 16. Final decision rule for agents

When deciding where code belongs, ask:

1.  **Who owns the business fact?** Put the authoritative write and
    validation there.
2.  **Is an immediate response required?** Use a documented REST API
    with timeouts.
3.  **Can the work happen asynchronously?** Publish/consume a versioned
    RabbitMQ event.
4.  **Does the change need another service's data?** Call that service
    or consume its event; never query its database.
5.  **Could the change break a consumer, expose data, or destroy
    state?** Add compatibility/security checks and seek approval where
    required.

**Default approach:** preserve SwiftDrop's five-service architecture,
keep ownership explicit, make the smallest safe change, test the
behavior, and document the contract.

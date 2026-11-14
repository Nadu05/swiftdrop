# SwiftDrop — Event Contract & Reliability Documentation

**Document:** `docs/event-contract-documentation.md`  
**Primary Topic Exchange:** `swiftdrop.events` (`TopicExchange`, durable)  
**Dead-Letter Exchange:** `swiftdrop.events.dlx` (`DirectExchange`, durable)

---

## 1. Messaging Topology & Reliability Guarantees

### 1.1 Exchanges, Queues & Bindings
| Component | Name | Type / Binding Keys | Purpose |
|---|---|---|---|
| **Domain Exchange** | `swiftdrop.events` | Durable `TopicExchange` | Canonical platform domain events across Organization, Order, Dispatch, and Notification |
| **Dead-Letter Exchange** | `swiftdrop.events.dlx` | Durable `DirectExchange` | Dead-letter target when consumer retries exhaust |
| **Order DLQ** | `order.events.dlq` | Bound to `swiftdrop.events.dlx` (`order.events.dlq`) | Configured in `order-service` `RabbitMQConfig` (`order.events.queue` -> DLX) |
| **Dispatch Queue** | `dispatch.events.queue` | Bound to `swiftdrop.events` (`dispatch.#`, `order.#`) | Consumes `OrderCreated`, `OrderConfirmed`, `OrderStatusChanged` in `OrderEventListener` |
| **Dispatch DLQ** | `dispatch.events.dlq` | Bound to `swiftdrop.events.dlx` (`dispatch.events.dlq`) | Receives exhausted failed dispatch listener messages |
| **Notification Queue** | `notification.events.queue` | Bound to `swiftdrop.events` (`notification.#`, `order.#`, `dispatch.#`, `organization.#`) | Consumes domain lifecycle events in `DomainEventNotificationListener` |
| **Notification DLQ** | `notification.events.dlq` | Bound to `swiftdrop.events.dlx` (`notification.events.dlq`) | Receives exhausted failed notification delivery events |

> **Note on Identity Exchange:** `identity-service` defines `swiftdrop.identity.exchange` (`IdentityEventPublisher`) for internal identity lifecycle logging (`user.registered`, `password.reset.requested`).

### 1.2 Transactional Outbox Pattern (Publishers)
Every domain event publisher writes an outbox record inside the active business transaction before publishing to RabbitMQ:
- **`organization-service`**: `V5__create_domain_outbox.sql` (`domain_outbox_events`), entity `OrganizationOutboxEvent`, publisher `OrganizationEventPublisher`.
- **`order-service`**: `V3__create_order_outbox.sql` (`domain_outbox_events`), entity `OrderOutboxEvent`, publisher `OrderEventPublisher`.
- **`dispatch-service`**: `V4__create_dispatch_outbox_and_inbox.sql` (`domain_outbox_events`), entity `DispatchOutboxEvent`, publisher `DispatchEventPublisher`.

**Publish Mechanics:**
1. Business state and outbox row (`status = PENDING`, `correlationId`, serialized JSON envelope) commit atomically in PostgreSQL.
2. `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` attempts immediate AMQP publish via `RabbitTemplate`.
3. If the broker is unavailable, a `@Scheduled` background relay polls due `PENDING` events and retries with exponential backoff until `SENT` or max retry exhaustion.

### 1.3 Idempotent Consumer Inbox, Retry & DLQ Policies
- **Idempotency Store (`processed_domain_events`):**
  - `dispatch-service` (`V4`): `DispatchProcessedEvent` (`eventId`, `consumerGroup`, `eventType`, `correlationId`, unique `(event_id, consumer_group)`). `OrderEventListener` deduplicates already-processed `eventId` entries and only persists inbox records on success.
  - `notification-service` (`V2`): `NotificationProcessedEvent` (`eventId`, `consumerGroup`, `eventType`, `correlationId`, unique `(event_id, consumer_group)`). `NotificationService` skips duplicate `eventId` deliveries.
- **Consumer Retry Policy:**
  - Configured on `SimpleRabbitListenerContainerFactory` in both `dispatch-service` and `notification-service`:
    - `defaultRequeueRejected = false`
    - `RetryInterceptorBuilder.stateless().maxAttempts(3).backOffOptions(500, 2.0, 4000)`
    - Recoverer: `RejectAndDontRequeueRecoverer` (routes exhausted messages to `swiftdrop.events.dlx` -> `*.events.dlq`).
- **Notification Failure Audit:** When `NotificationSenderPort` throws during `processDomainEvent`, `NotificationAuditHelper` persists a `FAILED` record in a `REQUIRES_NEW` transaction and `NotificationService` rethrows `NotificationDeliveryException` so AMQP retries & DLQ routing engage properly.

---

## 2. Canonical Envelope Format
All events emitted on `swiftdrop.events` use JSON serialization (`Jackson2JsonMessageConverter`) with standard top-level fields and `X-Correlation-Id` AMQP headers:
```json
{
  "eventId": "uuid",
  "eventType": "OrderConfirmed",
  "version": "1.0",
  "sourceService": "order-service",
  "correlationId": "corr-id",
  "occurredAt": "ISO-8601 timestamp",
  "routingKey": "order.confirmed"
}
```

---

## 3. Domain Event Contract Catalog

### 3.1 Organization Service Events
| Event Type | Routing Key | Key Payload Fields | Active Consumers |
|---|---|---|---|
| `MerchantApplicationSubmitted` | `organization.merchant.submitted` | `applicationId`, `applicationCode`, `applicantUserId`, `applicantEmail`, `businessName`, `businessRegistrationNumber`, `contactFullName`, `contactEmail`, `contactPhone`, `city`, `nearestBranch`, `status` | `notification-service` |
| `MerchantApplicationApproved` | `organization.merchant.approved` | Base merchant fields + `approvedByEmail`, `reviewNotes`, `reviewedAt` | `notification-service` |
| `MerchantApplicationRejected` | `organization.merchant.rejected` | Base merchant fields + `rejectedByEmail`, `rejectionReason`, `reviewedAt` | `notification-service` |

### 3.2 Order Service Events
| Event Type | Routing Key | Key Payload Fields | Active Consumers |
|---|---|---|---|
| `OrderCreated` | `order.created` | `orderId`, `trackingNumber`, `status`, `orderSourceType`, `customerUserId`, `customerEmail`, `merchantOrganizationId`, `pickupMethod`, `paymentMethod`, `paymentStatus`, `originBranchId/Code/Name`, `destinationBranchId/Code/Name`, `sameBranch`, `distanceKm`, `deliveryFee`, `codAmount`, `currency`, `senderName/Phone/Email`, `pickupCity`, `recipientName/Phone/Email`, `destinationCity` | `notification-service` (caches contacts), `dispatch-service` (ignores unpaid `PREPAID` in `PENDING_PAYMENT`, processes non-pending `CREATED`) |
| `OrderConfirmed` | `order.confirmed` | Base order fields + `confirmedAt` | `dispatch-service` (creates `PickupTask` for `COURIER_PICKUP`), `notification-service` |
| `OrderStatusChanged` | `order.status.changed` | Base order fields + `previousStatus`, `newStatus`, `failedAttemptCount` | `dispatch-service`, `notification-service` |

### 3.3 Dispatch Service Events
| Event Type | Routing Key | Key Payload Fields | Active Consumers |
|---|---|---|---|
| `PickupTaskCreated` | `dispatch.pickup.created` | `taskCode`, `orderId`, `trackingNumber`, `pickupMethod`, `originBranchId` | `notification-service` |
| `CourierAssigned` | `dispatch.courier.assigned` | `assignmentType` (`INITIAL` or `REASSIGNMENT`), `assignmentCode`, `taskType`, `orderId`, `trackingNumber`, `courierCode`, `courierName` (plus `fromCourierCode`/`toCourierCode`/`reason` on reassignment) | `notification-service` |
| `ParcelPickedUp` | `dispatch.parcel.picked_up` | `orderId`, `trackingNumber`, `courierCode`, `assignmentCode` | `notification-service` |
| `ParcelReceivedAtBranch` | `dispatch.parcel.received_at_branch` | `orderId`, `trackingNumber`, `branchId`, `branchName`, intake details | `notification-service` |
| `TRANSFER_MANIFEST_CREATED` | `dispatch.transfer.created` | `manifestCode`, `originBranchId`, `destinationBranchId`, `expectedParcelCount` | `notification-service` |
| `TRANSFER_MANIFEST_ASSIGNED` | `dispatch.transfer.assigned` | `manifestCode`, `courierCode`, `courierName` | `notification-service` |
| `PARCEL_CUSTODY_RECORDED` | `dispatch.custody.recorded` | `custodyCode`, `eventType`, `orderId`, `trackingNumber`, `manifestReference` | `notification-service` |
| `TransferManifestDispatched` | `dispatch.transfer.dispatched` | `manifestCode`, `originBranchId`, `destinationBranchId`, `courierCode`, `trackingNumbers` (`List<String>`) | `notification-service` |
| `ParcelReceivedAtDestinationBranch` | `dispatch.parcel.received_at_destination_branch` | `manifestCode`, `orderId`, `trackingNumber`, `destinationBranchId`, `destinationBranchName` | `notification-service` |
| `TRANSFER_MANIFEST_RECEIVED` | `dispatch.transfer.received` | `manifestCode`, parcel receipt counts & discrepancy info | `notification-service` |
| `TRANSFER_MANIFEST_COMPLETED` | `dispatch.transfer.completed` | `manifestCode`, completion summary | `notification-service` |
| `OutForDelivery` | `dispatch.delivery.out_for_delivery` | `orderId`, `trackingNumber`, `courierCode`, `courierName`, `assignmentCode` | `notification-service` |
| `DeliveryAttemptFailed` | `dispatch.delivery.attempt_failed` | `assignmentCode`, `jobCode`, `orderId`, `trackingNumber`, `attemptNumber`, `maxAttempts`, `reason`, `escalatedToDispatcher` | `notification-service` |
| `DeliveryCompleted` | `dispatch.delivery.completed` | `orderId`, `trackingNumber`, `jobCode`, `recipientName`, `podType`, POD reference | `notification-service` |
| `DELIVERY_EXCEPTION_RESOLVED` | `dispatch.exception.resolved` | `exceptionCode`, `orderId`, `trackingNumber`, `decisionAction` | `notification-service` |
| `ReturnToSenderInitiated` | `dispatch.return.initiated` | `returnCode`, `orderId`, `trackingNumber`, `reason` | `notification-service` |
| `RETURN_COURIER_ASSIGNED` | `dispatch.return.courier_assigned` | `returnCode`, `orderId`, `trackingNumber`, `courierCode` | `notification-service` |
| `RETURN_TASK_MOVEMENT` | `dispatch.return.movement` | `returnCode`, `orderId`, `trackingNumber`, `status`, `location` | `notification-service` |
| `ReturnedToSender` | `dispatch.return.completed` | `returnCode`, `orderId`, `trackingNumber`, `senderConfirmedBy` | `notification-service` |


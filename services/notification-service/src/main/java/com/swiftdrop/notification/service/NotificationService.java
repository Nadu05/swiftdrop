package com.swiftdrop.notification.service;

import com.swiftdrop.notification.config.CorrelationIdHolder;
import com.swiftdrop.notification.dto.BranchCredentialsNotificationRequest;
import com.swiftdrop.notification.dto.BranchCredentialsNotificationResponse;
import com.swiftdrop.notification.dto.NotificationDto;
import com.swiftdrop.notification.dto.PublicTrackingNotificationDto;
import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.entity.NotificationOrderContact;
import com.swiftdrop.notification.entity.NotificationProcessedEvent;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import com.swiftdrop.notification.exception.ResourceNotFoundException;
import com.swiftdrop.notification.repository.NotificationOrderContactRepository;
import com.swiftdrop.notification.repository.NotificationProcessedEventRepository;
import com.swiftdrop.notification.repository.NotificationRepository;
import com.swiftdrop.notification.security.NotificationUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class NotificationService {

    public static final String CONSUMER_GROUP = "notification-events-consumer";
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final NotificationRepository notificationRepository;
    private final NotificationOrderContactRepository contactRepository;
    private final NotificationProcessedEventRepository processedEventRepository;
    private final NotificationSenderPort senderPort;
    private final NotificationAuditHelper auditHelper;

    @Autowired
    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationOrderContactRepository contactRepository,
            NotificationProcessedEventRepository processedEventRepository,
            NotificationSenderPort senderPort,
            @Autowired(required = false) NotificationAuditHelper auditHelper) {
        this.notificationRepository = notificationRepository;
        this.contactRepository = contactRepository;
        this.processedEventRepository = processedEventRepository;
        this.senderPort = senderPort;
        this.auditHelper = auditHelper;
    }

    public List<NotificationDto> processDomainEvent(Map<String, Object> event) {
        if (event == null || !event.containsKey("eventType")) {
            return List.of();
        }

        String rawEventType = String.valueOf(event.get("eventType"));
        String normalizedType = rawEventType.replace("_", "").trim().toLowerCase(Locale.ROOT);
        String correlationId = str(event.get("correlationId")) != null
                ? str(event.get("correlationId"))
                : CorrelationIdHolder.currentOrNew();
        String eventId = resolveEventId(event, rawEventType);

        if (processedEventRepository.existsByEventIdAndConsumerGroup(eventId, CONSUMER_GROUP)) {
            log.info("[corr={}] Deduplicated duplicate eventId={} type={}", correlationId, eventId, rawEventType);
            return List.of();
        }

        List<NotificationEntity> created = switch (normalizedType) {
            case "ordercreated" -> handleOrderCreated(event, eventId, rawEventType, correlationId);
            case "orderconfirmed" -> handleOrderConfirmed(event, eventId, rawEventType, correlationId);
            case "orderstatuschanged" -> handleOrderStatusChanged(event, eventId, rawEventType, correlationId);
            case "pickuptaskcreated" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "PICKUP_TASK_CREATED",
                    "Pickup scheduled for parcel " + trackingRef(event),
                    "Pickup task " + orEmpty(event.get("taskCode")) + " created at " + orEmpty(event.get("originBranchName")) + ".");
            case "courierassigned", "pickupcourierassigned", "deliverycourierassigned", "courierreassigned" ->
                    handleCourierAssigned(event, eventId, rawEventType, correlationId);
            case "parcelpickedup" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "PARCEL_PICKED_UP",
                    "Parcel " + trackingRef(event) + " picked up",
                    "Courier " + orEmpty(event.get("courierName"), orEmpty(event.get("courierCode"))) + " collected parcel " + trackingRef(event) + ".");
            case "parcelreceivedatbranch", "branchdropoffconfirmed" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "PARCEL_RECEIVED_AT_BRANCH",
                    "Parcel " + trackingRef(event) + " received at origin branch",
                    "Parcel " + trackingRef(event) + " checked in at " + orEmpty(event.get("branchName"), "origin branch") + ".");
            case "transfermanifestdispatched", "transfermanifestdeparted" ->
                    handleTransferDispatched(event, eventId, rawEventType, correlationId);
            case "parcelreceivedatdestinationbranch" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "ARRIVED_DESTINATION_BRANCH",
                    "Parcel " + trackingRef(event) + " arrived at destination branch",
                    "Parcel " + trackingRef(event) + " arrived at destination hub " + orEmpty(event.get("destinationBranchName"))
                            + " (manifest " + orEmpty(event.get("manifestCode")) + ").");
            case "outfordelivery" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "OUT_FOR_DELIVERY",
                    "Parcel " + trackingRef(event) + " is out for delivery",
                    "Courier " + orEmpty(event.get("courierName"), orEmpty(event.get("courierCode"))) + " is on the way to deliver " + trackingRef(event) + ".");
            case "deliveryattemptfailed", "deliveryescalatedtodispatcher" ->
                    createForOrder(event, eventId, rawEventType, correlationId,
                            "DELIVERY_FAILED",
                            "Delivery attempt #" + orEmpty(event.get("attemptNumber"), "1") + " unsuccessful for " + trackingRef(event),
                            "Attempt failed for " + trackingRef(event) + ": " + orEmpty(event.get("reason"), "Recipient unavailable") + ".");
            case "deliverycompleted" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "DELIVERY_COMPLETED",
                    "Parcel " + trackingRef(event) + " delivered",
                    "Delivered to " + orEmpty(event.get("recipientName"), "recipient")
                            + " (" + orEmpty(event.get("proofType"), "POD") + " verified).");
            case "returntosenderinitiated" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "RTS_INITIATED",
                    "Return-to-sender initiated for " + trackingRef(event),
                    "Parcel " + trackingRef(event) + " marked for Return to Sender (" + orEmpty(event.get("returnCode"))
                            + "): " + orEmpty(event.get("reason")) + ".");
            case "returnedtosender" -> createForOrder(event, eventId, rawEventType, correlationId,
                    "RTS_COMPLETED",
                    "Parcel " + trackingRef(event) + " returned to sender",
                    "Return task " + orEmpty(event.get("returnCode")) + " completed and signed by "
                            + orEmpty(event.get("senderConfirmedBy"), "sender") + ".");
            case "merchantapplicationsubmitted" -> createForMerchant(event, eventId, rawEventType, correlationId,
                    "MERCHANT_APPLICATION_SUBMITTED",
                    "Merchant application received (" + orEmpty(event.get("applicationCode")) + ")",
                    "Application for " + orEmpty(event.get("businessName")) + " (" + orEmpty(event.get("applicationCode"))
                            + ") was submitted for Head Office review.");
            case "merchantapplicationapproved" -> createForMerchant(event, eventId, rawEventType, correlationId,
                    "MERCHANT_APPLICATION_APPROVED",
                    "Merchant application approved (" + orEmpty(event.get("applicationCode")) + ")",
                    "Congratulations! Merchant onboarding application " + orEmpty(event.get("applicationCode"))
                            + " for " + orEmpty(event.get("businessName")) + " has been approved.");
            case "merchantapplicationrejected" -> createForMerchant(event, eventId, rawEventType, correlationId,
                    "MERCHANT_APPLICATION_REJECTED",
                    "Merchant application decision (" + orEmpty(event.get("applicationCode")) + ")",
                    "Merchant onboarding application " + orEmpty(event.get("applicationCode"))
                            + " was declined: " + orEmpty(event.get("rejectionReason"), "See review notes") + ".");
            default -> List.of();
        };

        List<NotificationDto> dispatched = new ArrayList<>();
        for (NotificationEntity entity : created) {
            dispatched.add(toDto(deliverAndSave(entity)));
        }

        processedEventRepository.save(new NotificationProcessedEvent(
                eventId,
                CONSUMER_GROUP,
                rawEventType,
                correlationId
        ));
        return dispatched;
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> listNotifications(
            NotificationUserPrincipal principal,
            String trackingNumber,
            String statusFilter) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        List<NotificationEntity> entities;
        if (trackingNumber != null && !trackingNumber.isBlank()) {
            entities = notificationRepository.findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc(trackingNumber.trim());
            if (!principal.isStaff()) {
                entities = entities.stream()
                        .filter(n -> ownsNotification(n, principal))
                        .toList();
            }
        } else if (principal.isStaff()) {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                entities = notificationRepository.findByStatusOrderByCreatedAtAsc(statusFilter.trim().toUpperCase(Locale.ROOT));
            } else {
                entities = notificationRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            List<NotificationEntity> byUser = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(principal.userId());
            if (byUser.isEmpty() && principal.email() != null) {
                byUser = notificationRepository.findByRecipientEmailIgnoreCaseOrderByCreatedAtDesc(principal.email());
            }
            entities = byUser;
        }

        return entities.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicTrackingNotificationDto> getPublicTrackingNotifications(String trackingNumber) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            throw new IllegalArgumentException("Tracking number is required");
        }
        return notificationRepository.findByTrackingNumberIgnoreCaseOrderByCreatedAtAsc(trackingNumber.trim())
                .stream()
                .map(n -> new PublicTrackingNotificationDto(
                        n.getTrackingNumber(),
                        n.getEventType(),
                        n.getNotificationType(),
                        n.getChannel(),
                        n.getTitle(),
                        n.getStatus(),
                        n.getSentAt(),
                        n.getCreatedAt()
                ))
                .toList();
    }

    public NotificationDto markAsRead(String idOrCode, NotificationUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required");
        }
        NotificationEntity entity = resolveNotification(idOrCode);
        if (!principal.isStaff() && !ownsNotification(entity, principal)) {
            throw new AccessDeniedException("You do not have permission to update this notification");
        }
        if (entity.getReadAt() == null) {
            entity.setReadAt(LocalDateTime.now());
            entity = notificationRepository.save(entity);
        }
        return toDto(entity);
    }

    public List<NotificationDto> retryFailedNotifications(NotificationUserPrincipal principal) {
        if (principal == null || !principal.isStaff()) {
            throw new AccessDeniedException("Only ADMIN or DISPATCHER roles can retry failed notifications");
        }
        List<NotificationEntity> failed = notificationRepository.findByStatusOrderByCreatedAtAsc(NotificationEntity.STATUS_FAILED);
        List<NotificationDto> retried = new ArrayList<>();
        for (NotificationEntity entity : failed) {
            retried.add(toDto(deliverAndSave(entity)));
        }
        return retried;
    }

    public BranchCredentialsNotificationResponse sendBranchCredentials(
            BranchCredentialsNotificationRequest request,
            NotificationUserPrincipal principal) {
        if (principal == null || !principal.isGlobalAdmin()) {
            throw new AccessDeniedException("Only ADMIN, HEAD_OFFICE_ADMIN, or INTERNAL_SERVICE can send branch credentials");
        }

        String branchName = request.branchName().trim();
        String branchCode = request.branchCode().trim();
        String recipientEmail = request.recipientEmail().trim();
        String loginEmail = request.loginEmail().trim();

        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode(nextNotificationCode());
        entity.setEventId("branch-cred-" + UUID.randomUUID());
        entity.setEventType("BranchCredentialsIssued");
        entity.setNotificationType("BRANCH_MANAGER_CREDENTIALS");
        entity.setChannel("EMAIL");
        entity.setRecipientEmail(recipientEmail);
        entity.setRecipientName(branchName + " Branch Manager");
        entity.setTitle("SwiftDrop Branch Manager Credentials - " + branchName + " (" + branchCode + ")");
        entity.setMessage(String.format(
                "Your SwiftDrop Branch Manager account for %s (%s) is ready.%n%n"
                        + "Login Email: %s%n"
                        + "Temporary Password: %s%n%n"
                        + "Please sign in and change your password immediately.",
                branchName, branchCode, loginEmail, request.temporaryPassword()
        ));
        entity.setCorrelationId(CorrelationIdHolder.currentOrNew());
        entity.setStatus(NotificationEntity.STATUS_PENDING);
        entity.setAttemptCount(1);

        try {
            senderPort.send(entity);
            entity.setStatus(NotificationEntity.STATUS_SENT);
            entity.setSentAt(LocalDateTime.now());
            entity.setErrorMessage(null);
            notificationRepository.save(entity);
            return new BranchCredentialsNotificationResponse(
                    entity.getNotificationCode(),
                    NotificationEntity.STATUS_SENT,
                    null,
                    entity.getSentAt()
            );
        } catch (RuntimeException ex) {
            entity.setStatus(NotificationEntity.STATUS_FAILED);
            entity.setErrorMessage(truncate(ex.getMessage(), 950));
            notificationRepository.save(entity);
            return new BranchCredentialsNotificationResponse(
                    entity.getNotificationCode(),
                    NotificationEntity.STATUS_FAILED,
                    entity.getErrorMessage(),
                    null
            );
        }
    }

    private NotificationEntity deliverAndSave(NotificationEntity entity) {
        int nextAttempt = entity.getAttemptCount() + 1;
        entity.setAttemptCount(nextAttempt);
        try {
            senderPort.send(entity);
            entity.setStatus(NotificationEntity.STATUS_SENT);
            entity.setSentAt(LocalDateTime.now());
            entity.setErrorMessage(null);
            return notificationRepository.save(entity);
        } catch (NotificationDeliveryException ex) {
            entity.setStatus(NotificationEntity.STATUS_FAILED);
            entity.setErrorMessage(truncate(ex.getMessage(), 950));
            if (auditHelper != null) {
                auditHelper.recordFailureInNewTx(entity, ex.getMessage());
            } else {
                notificationRepository.save(entity);
            }
            throw ex;
        }
    }

    private List<NotificationEntity> handleOrderCreated(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId) {
        NotificationOrderContact contact = upsertOrderContact(event);
        String orderStatus = str(event.get("status"));
        if ("CREATED".equalsIgnoreCase(orderStatus) && "PENDING_PAYMENT".equalsIgnoreCase(str(event.get("paymentStatus")))) {
            NotificationEntity entity = buildOrderNotification(
                    contact,
                    event,
                    eventId,
                    eventType,
                    correlationId,
                    "ORDER_CREATED_PENDING_PAYMENT",
                    "Order " + contact.getTrackingNumber() + " created (awaiting payment)",
                    "Your order " + contact.getTrackingNumber() + " was created and is awaiting prepaid payment confirmation."
            );
            return List.of(entity);
        }
        return List.of();
    }

    private List<NotificationEntity> handleOrderConfirmed(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId) {
        NotificationOrderContact contact = upsertOrderContact(event);
        NotificationEntity entity = buildOrderNotification(
                contact,
                event,
                eventId,
                eventType,
                correlationId,
                "ORDER_CONFIRMED",
                "Order " + contact.getTrackingNumber() + " confirmed",
                "Order " + contact.getTrackingNumber() + " from " + orEmpty(contact.getOriginBranchName(), "origin")
                        + " to " + orEmpty(contact.getDestinationBranchName(), "destination")
                        + " is confirmed for " + orEmpty(event.get("pickupMethod"), "dispatch") + "."
        );
        return List.of(entity);
    }

    private List<NotificationEntity> handleOrderStatusChanged(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId) {
        String newStatus = str(event.get("newStatus"));
        if ("CANCELLED".equalsIgnoreCase(newStatus)) {
            return createForOrder(event, eventId, eventType, correlationId,
                    "ORDER_CANCELLED",
                    "Order " + trackingRef(event) + " cancelled",
                    "Delivery order " + trackingRef(event) + " has been cancelled.");
        }
        return List.of();
    }

    private List<NotificationEntity> handleCourierAssigned(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId) {
        String assignmentType = str(event.get("assignmentType"));
        String courierDisplay = orEmpty(event.get("courierName"), orEmpty(event.get("courierCode"), "Courier"));
        if ("PICKUP".equalsIgnoreCase(assignmentType) || "PICKUPCOURIERASSIGNED".equalsIgnoreCase(eventType.replace("_", ""))) {
            return createForOrder(event, eventId, eventType, correlationId,
                    "PICKUP_ASSIGNED",
                    "Courier assigned for pickup (" + trackingRef(event) + ")",
                    "Courier " + courierDisplay + " has been assigned to collect parcel " + trackingRef(event) + ".");
        }
        if ("REASSIGNMENT".equalsIgnoreCase(assignmentType)) {
            return createForOrder(event, eventId, eventType, correlationId,
                    "COURIER_REASSIGNED",
                    "Courier reassigned for " + trackingRef(event),
                    "New courier " + courierDisplay + " assigned to parcel " + trackingRef(event)
                            + (str(event.get("reason")) != null ? " (" + str(event.get("reason")) + ")" : "") + ".");
        }
        return createForOrder(event, eventId, eventType, correlationId,
                "COURIER_ASSIGNED",
                "Courier assigned for " + trackingRef(event),
                "Courier " + courierDisplay + " assigned to handle parcel " + trackingRef(event) + ".");
    }

    private List<NotificationEntity> handleTransferDispatched(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId) {
        Object rawList = event.get("trackingNumbers");
        List<String> trackings = new ArrayList<>();
        if (rawList instanceof Collection<?> col) {
            for (Object item : col) {
                if (item != null && !String.valueOf(item).isBlank()) {
                    trackings.add(String.valueOf(item).trim());
                }
            }
        }
        if (trackings.isEmpty() && str(event.get("trackingNumber")) != null) {
            trackings.add(str(event.get("trackingNumber")));
        }

        List<NotificationEntity> list = new ArrayList<>();
        String manifestCode = orEmpty(event.get("manifestCode"), "TMF");
        String originName = orEmpty(event.get("originBranchName"), "origin hub");
        String destName = orEmpty(event.get("destinationBranchName"), "destination hub");
        String courierName = orEmpty(event.get("courierName"), orEmpty(event.get("courierCode"), "courier"));

        for (String tracking : trackings) {
            NotificationOrderContact contact = contactRepository.findByTrackingNumberIgnoreCase(tracking).orElse(null);
            Map<String, Object> perTrackingEvent = new LinkedHashMap<>(event);
            perTrackingEvent.put("trackingNumber", tracking);
            list.add(buildOrderNotification(
                    contact,
                    perTrackingEvent,
                    eventId,
                    eventType,
                    correlationId,
                    "IN_TRANSIT_UPDATE",
                    "Parcel " + tracking + " in transit to " + destName,
                    "Parcel " + tracking + " departed " + originName + " toward " + destName
                            + " on transfer manifest " + manifestCode + " with " + courierName + "."
            ));
        }
        return list;
    }

    private List<NotificationEntity> createForOrder(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId,
            String notificationType,
            String title,
            String message) {
        String tracking = str(event.get("trackingNumber"));
        NotificationOrderContact contact = tracking != null
                ? contactRepository.findByTrackingNumberIgnoreCase(tracking).orElse(null)
                : null;
        if (contact == null && str(event.get("orderId")) != null) {
            contact = contactRepository.findByOrderId(str(event.get("orderId"))).orElse(null);
        }
        return List.of(buildOrderNotification(
                contact,
                event,
                eventId,
                eventType,
                correlationId,
                notificationType,
                title,
                message
        ));
    }

    private List<NotificationEntity> createForMerchant(
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId,
            String notificationType,
            String title,
            String message) {
        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode(nextNotificationCode());
        entity.setEventId(eventId);
        entity.setEventType(eventType);
        entity.setNotificationType(notificationType);
        entity.setChannel("EMAIL");
        entity.setRecipientUserId(str(event.get("applicantUserId")));
        entity.setRecipientEmail(firstNonBlank(str(event.get("contactEmail")), str(event.get("applicantEmail"))));
        entity.setRecipientName(firstNonBlank(str(event.get("contactFullName")), str(event.get("businessName"))));
        entity.setApplicationCode(str(event.get("applicationCode")));
        entity.setTitle(title);
        entity.setMessage(message);
        entity.setCorrelationId(correlationId);
        entity.setStatus(NotificationEntity.STATUS_PENDING);
        return List.of(entity);
    }

    private NotificationEntity buildOrderNotification(
            NotificationOrderContact contact,
            Map<String, Object> event,
            String eventId,
            String eventType,
            String correlationId,
            String notificationType,
            String title,
            String message) {
        NotificationEntity entity = new NotificationEntity();
        entity.setNotificationCode(nextNotificationCode());
        entity.setEventId(eventId);
        entity.setEventType(eventType);
        entity.setNotificationType(notificationType);
        entity.setChannel("EMAIL");
        entity.setOrderId(firstNonBlank(str(event.get("orderId")), contact != null ? contact.getOrderId() : null));
        entity.setTrackingNumber(firstNonBlank(str(event.get("trackingNumber")), contact != null ? contact.getTrackingNumber() : null));
        entity.setRecipientUserId(firstNonBlank(str(event.get("customerUserId")), contact != null ? contact.getCustomerUserId() : null));
        entity.setRecipientEmail(firstNonBlank(
                str(event.get("customerEmail")),
                str(event.get("recipientEmail")),
                str(event.get("senderEmail")),
                contact != null ? contact.getCustomerEmail() : null,
                contact != null ? contact.getRecipientEmail() : null,
                contact != null ? contact.getSenderEmail() : null
        ));
        entity.setRecipientName(firstNonBlank(
                str(event.get("senderName")),
                str(event.get("recipientName")),
                contact != null ? contact.getSenderName() : null,
                contact != null ? contact.getRecipientName() : null
        ));
        entity.setTitle(title);
        entity.setMessage(message);
        entity.setCorrelationId(correlationId);
        entity.setStatus(NotificationEntity.STATUS_PENDING);
        return entity;
    }

    private NotificationOrderContact upsertOrderContact(Map<String, Object> event) {
        String tracking = str(event.get("trackingNumber"));
        if (tracking == null) {
            NotificationOrderContact transientContact = new NotificationOrderContact();
            transientContact.setOrderId(str(event.get("orderId")));
            return transientContact;
        }
        NotificationOrderContact contact = contactRepository.findByTrackingNumberIgnoreCase(tracking)
                .orElseGet(NotificationOrderContact::new);
        contact.setTrackingNumber(tracking);
        if (str(event.get("orderId")) != null) contact.setOrderId(str(event.get("orderId")));
        if (str(event.get("customerUserId")) != null) contact.setCustomerUserId(str(event.get("customerUserId")));
        if (str(event.get("customerEmail")) != null) contact.setCustomerEmail(str(event.get("customerEmail")));
        if (str(event.get("senderName")) != null) contact.setSenderName(str(event.get("senderName")));
        if (str(event.get("senderEmail")) != null) contact.setSenderEmail(str(event.get("senderEmail")));
        if (str(event.get("recipientName")) != null) contact.setRecipientName(str(event.get("recipientName")));
        if (str(event.get("recipientEmail")) != null) contact.setRecipientEmail(str(event.get("recipientEmail")));
        if (str(event.get("originBranchName")) != null) contact.setOriginBranchName(str(event.get("originBranchName")));
        if (str(event.get("destinationBranchName")) != null) contact.setDestinationBranchName(str(event.get("destinationBranchName")));
        return contactRepository.save(contact);
    }

    private NotificationEntity resolveNotification(String idOrCode) {
        if (idOrCode == null || idOrCode.isBlank()) {
            throw new IllegalArgumentException("Notification identifier is required");
        }
        String clean = idOrCode.trim();
        Optional<NotificationEntity> byCode = notificationRepository.findByNotificationCodeIgnoreCase(clean);
        if (byCode.isPresent()) {
            return byCode.get();
        }
        try {
            long id = Long.parseLong(clean);
            return notificationRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + clean));
        } catch (NumberFormatException ex) {
            throw new ResourceNotFoundException("Notification not found: " + clean);
        }
    }

    private boolean ownsNotification(NotificationEntity entity, NotificationUserPrincipal principal) {
        if (entity.getRecipientUserId() != null && entity.getRecipientUserId().equals(principal.userId())) {
            return true;
        }
        return entity.getRecipientEmail() != null
                && principal.email() != null
                && entity.getRecipientEmail().equalsIgnoreCase(principal.email());
    }

    private NotificationDto toDto(NotificationEntity n) {
        return new NotificationDto(
                n.getId(),
                n.getNotificationCode(),
                n.getEventId(),
                n.getEventType(),
                n.getNotificationType(),
                n.getChannel(),
                n.getRecipientUserId(),
                n.getRecipientEmail(),
                n.getRecipientName(),
                n.getTrackingNumber(),
                n.getOrderId(),
                n.getApplicationCode(),
                n.getTitle(),
                n.getMessage(),
                n.getCorrelationId(),
                n.getStatus(),
                n.getAttemptCount(),
                n.getErrorMessage(),
                n.getReadAt(),
                n.getSentAt(),
                n.getCreatedAt()
        );
    }

    private String nextNotificationCode() {
        String code;
        do {
            code = "NTF-" + (100000 + RANDOM.nextInt(900000));
        } while (notificationRepository.findByNotificationCodeIgnoreCase(code).isPresent());
        return code;
    }

    private String resolveEventId(Map<String, Object> event, String eventType) {
        String explicit = str(event.get("eventId"));
        if (explicit != null) {
            return explicit;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = eventType + "|" + event.get("orderId") + "|" + event.get("trackingNumber")
                    + "|" + event.get("applicationCode") + "|" + event.get("occurredAt");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return "gen-" + HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (Exception ex) {
            return UUID.randomUUID().toString();
        }
    }

    private String trackingRef(Map<String, Object> event) {
        return orEmpty(event.get("trackingNumber"), orEmpty(event.get("orderId"), "parcel"));
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return null;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String prefix = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return prefix + "***@" + parts[1];
    }

    private String str(Object val) {
        if (val == null) return null;
        String s = String.valueOf(val).trim();
        return s.isEmpty() ? null : s;
    }

    private String orEmpty(Object val) {
        return orEmpty(val, "");
    }

    private String orEmpty(Object val, String fallback) {
        String s = str(val);
        return s != null ? s : fallback;
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}


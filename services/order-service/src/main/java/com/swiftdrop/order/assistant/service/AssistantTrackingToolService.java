package com.swiftdrop.order.assistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolCall;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolDefinition;
import com.swiftdrop.order.dto.DeliveryOrderResponse;
import com.swiftdrop.order.dto.DeliveryOrderResponse.TrackingEventDto;
import com.swiftdrop.order.entity.enums.OrderLifecycleStatus;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.security.OrderUserPrincipal;
import com.swiftdrop.order.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validated and ownership-enforced backend tool executor for AI parcel tracking.
 * Reuses {@link OrderService#getOrderByIdOrTracking(String, OrderUserPrincipal)} so
 * customer parcel ownership rules are enforced exclusively on the backend.
 */
@Service
public class AssistantTrackingToolService {

    private static final Logger log = LoggerFactory.getLogger(AssistantTrackingToolService.class);

    public static final String TOOL_NAME = "track_parcel";

    private static final Pattern STRICT_NORMALIZED_TRACKING_PATTERN = Pattern.compile("^SD-[A-Z0-9]{4,12}$");
    private static final Pattern UNHYPHENATED_SD_PATTERN = Pattern.compile("^SD([A-Z0-9]{4,12})$");
    private static final Pattern CONVERSATION_TRACKING_PATTERN = Pattern.compile("(?i)\\b(SD-?[A-Z0-9]{4,12})\\b");
    private static final Pattern CONTAINS_DIGIT_PATTERN = Pattern.compile(".*\\d.*");

    public enum TrackingOutcomeStatus {
        SUCCESS,
        MISSING_TRACKING_NUMBER,
        INVALID_TRACKING_NUMBER,
        NOT_FOUND,
        ACCESS_DENIED,
        SERVICE_UNAVAILABLE
    }

    public record SafeTrackingEvent(
            String status,
            String statusLabel,
            String location,
            String description,
            String timestamp
    ) {
    }

    public record ParcelTrackingOutcome(
            TrackingOutcomeStatus status,
            String customerMessage,
            String trackingNumber,
            String lifecycleStatus,
            String statusLabel,
            String statusMeaning,
            String originArea,
            String destinationArea,
            String originBranchName,
            String destinationBranchName,
            String pickupMethod,
            String parcelSize,
            BigDecimal weightKg,
            int failedAttemptCount,
            String cancellationReason,
            String deliveredAt,
            String updatedAt,
            SafeTrackingEvent latestEvent,
            List<SafeTrackingEvent> trackingEvents
    ) {
        public static ParcelTrackingOutcome error(
                TrackingOutcomeStatus status,
                String customerMessage,
                String trackingNumber) {
            return new ParcelTrackingOutcome(
                    status,
                    customerMessage,
                    trackingNumber,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    0,
                    null,
                    null,
                    null,
                    null,
                    List.of()
            );
        }

        public String toFormattedSummary() {
            if (status != TrackingOutcomeStatus.SUCCESS) {
                return customerMessage;
            }
            StringBuilder sb = new StringBuilder();
            String label = statusLabel != null && !statusLabel.isBlank() ? statusLabel : lifecycleStatus;
            sb.append("Parcel ").append(trackingNumber).append(" is currently **").append(label).append("**");
            if (statusMeaning != null && !statusMeaning.isBlank()) {
                sb.append(" — ").append(statusMeaning);
            } else {
                sb.append(".");
            }

            if (originArea != null || destinationArea != null) {
                sb.append("\n\nRoute: ")
                        .append(originArea != null ? originArea : "Origin")
                        .append(" → ")
                        .append(destinationArea != null ? destinationArea : "Destination");
            }

            if (latestEvent != null) {
                sb.append("\nLatest update: ");
                if (latestEvent.description() != null && !latestEvent.description().isBlank()) {
                    sb.append(latestEvent.description());
                } else {
                    sb.append(latestEvent.statusLabel() != null ? latestEvent.statusLabel() : latestEvent.status());
                }
                if (latestEvent.location() != null && !latestEvent.location().isBlank()) {
                    sb.append(" at ").append(latestEvent.location());
                }
                if (latestEvent.timestamp() != null && !latestEvent.timestamp().isBlank()) {
                    sb.append(" (").append(latestEvent.timestamp()).append(")");
                }
            } else if (updatedAt != null && !updatedAt.isBlank()) {
                sb.append("\nLast updated: ").append(updatedAt);
            }

            if (deliveredAt != null && !deliveredAt.isBlank()) {
                sb.append("\nDelivered at: ").append(deliveredAt);
            }
            if (failedAttemptCount > 0) {
                sb.append("\nFailed delivery attempts: ").append(failedAttemptCount);
            }
            return sb.toString();
        }
    }

    public static final class ExecutionTracker {
        private ParcelTrackingOutcome latestOutcome;
        private boolean invoked;

        public void record(ParcelTrackingOutcome outcome) {
            this.invoked = true;
            this.latestOutcome = outcome;
        }

        public boolean isInvoked() {
            return invoked;
        }

        public ParcelTrackingOutcome getLatestOutcome() {
            return latestOutcome;
        }
    }

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    public AssistantTrackingToolService(OrderService orderService, ObjectMapper objectMapper) {
        this.orderService = orderService;
        this.objectMapper = objectMapper;
    }

    public LlmToolDefinition getToolDefinition() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("trackingNumber", Map.of(
                "type", "string",
                "description", "SwiftDrop tracking number in SD-XXXXX format (for example SD-91001). Omit or leave blank on follow-up questions if referring to the parcel already discussed in conversation history."
        ));

        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("type", "object");
        parameters.put("properties", properties);
        parameters.put("required", List.of());

        return new LlmToolDefinition(
                TOOL_NAME,
                "Retrieve real-time parcel tracking status, location, and milestone history for the authenticated customer's parcel.",
                parameters
        );
    }

    public String executeToolCall(
            LlmToolCall toolCall,
            OrderUserPrincipal principal,
            String userMessage,
            List<LlmMessage> history,
            ExecutionTracker tracker) {

        String rawArg = extractRawTrackingArg(toolCall != null ? toolCall.argumentsJson() : null);
        ParcelTrackingOutcome outcome = lookupTracking(rawArg, principal, userMessage, history);
        if (tracker != null) {
            tracker.record(outcome);
        }
        return serializeOutcome(outcome);
    }

    public ParcelTrackingOutcome lookupTracking(
            String rawTrackingArg,
            OrderUserPrincipal principal,
            String userMessage,
            List<LlmMessage> history) {

        String candidate = cleanArg(rawTrackingArg);
        String normalizedTrackingNumber;

        if (candidate != null) {
            Optional<String> normalized = normalizeValidTrackingNumber(candidate);
            if (normalized.isEmpty()) {
                return ParcelTrackingOutcome.error(
                        TrackingOutcomeStatus.INVALID_TRACKING_NUMBER,
                        "That doesn't look like a valid SwiftDrop tracking number. Please share your tracking number in `SD-XXXXX` format (for example: `SD-91001`).",
                        candidate
                );
            }
            normalizedTrackingNumber = normalized.get();
        } else {
            Optional<String> extracted = findTrackingNumberInConversation(userMessage, history);
            if (extracted.isEmpty()) {
                return ParcelTrackingOutcome.error(
                        TrackingOutcomeStatus.MISSING_TRACKING_NUMBER,
                        "I'd be happy to check your parcel status! Please provide your SwiftDrop tracking number (for example: `SD-91001`).",
                        null
                );
            }
            normalizedTrackingNumber = extracted.get();
        }

        return lookupNormalizedOrder(normalizedTrackingNumber, principal);
    }

    public Optional<String> findTrackingNumberInConversation(String userMessage, List<LlmMessage> history) {
        Optional<String> fromCurrent = extractFirstTrackingNumberFromText(userMessage);
        if (fromCurrent.isPresent()) {
            return fromCurrent;
        }
        if (history != null && !history.isEmpty()) {
            for (int i = history.size() - 1; i >= 0; i--) {
                LlmMessage msg = history.get(i);
                if (msg == null || msg.content() == null) {
                    continue;
                }
                Optional<String> fromHistory = extractLastTrackingNumberFromText(msg.content());
                if (fromHistory.isPresent()) {
                    return fromHistory;
                }
            }
        }
        return Optional.empty();
    }

    private ParcelTrackingOutcome lookupNormalizedOrder(String trackingNumber, OrderUserPrincipal principal) {
        if (principal == null || principal.userId() == null || principal.userId().isBlank()) {
            return ParcelTrackingOutcome.error(
                    TrackingOutcomeStatus.ACCESS_DENIED,
                    "Authentication is required to track parcels.",
                    trackingNumber
            );
        }

        try {
            DeliveryOrderResponse order = orderService.getOrderByIdOrTracking(trackingNumber, principal);
            return toSafeOutcome(order);
        } catch (AccessDeniedException ex) {
            log.warn("Denied parcel tracking lookup for tracking={} user={}", trackingNumber, principal.userId());
            return ParcelTrackingOutcome.error(
                    TrackingOutcomeStatus.ACCESS_DENIED,
                    "I cannot share details for tracking number " + trackingNumber
                            + " because it is not associated with your customer account.",
                    trackingNumber
            );
        } catch (ResourceNotFoundException ex) {
            return ParcelTrackingOutcome.error(
                    TrackingOutcomeStatus.NOT_FOUND,
                    "I couldn't find a parcel with tracking number " + trackingNumber
                            + ". Please double-check the tracking number and try again.",
                    trackingNumber
            );
        } catch (Exception ex) {
            log.error("Parcel tracking lookup failed for tracking={}: {}", trackingNumber, ex.getClass().getSimpleName());
            return ParcelTrackingOutcome.error(
                    TrackingOutcomeStatus.SERVICE_UNAVAILABLE,
                    "Sorry, parcel tracking information is temporarily unavailable right now. Please try again in a moment or check the Track Parcel page.",
                    trackingNumber
            );
        }
    }

    private ParcelTrackingOutcome toSafeOutcome(DeliveryOrderResponse order) {
        if (order == null) {
            return ParcelTrackingOutcome.error(
                    TrackingOutcomeStatus.SERVICE_UNAVAILABLE,
                    "Sorry, parcel tracking information is temporarily unavailable right now. Please try again in a moment.",
                    null
            );
        }

        String statusCode = order.getStatus();
        String statusLabel = order.getStatusLabel() != null && !order.getStatusLabel().isBlank()
                ? order.getStatusLabel()
                : resolveDisplayLabel(statusCode);
        String statusMeaning = describeStatus(statusCode);

        String originArea = firstNonBlank(order.getPickupCity(), order.getOriginBranchName());
        String destinationArea = firstNonBlank(order.getDropoffCity(), order.getDestinationBranchName());

        List<SafeTrackingEvent> safeEvents = new ArrayList<>();
        if (order.getTrackingEvents() != null) {
            for (TrackingEventDto ev : order.getTrackingEvents()) {
                if (ev == null) {
                    continue;
                }
                String evLabel = firstNonBlank(ev.getStatusLabel(), resolveDisplayLabel(ev.getStatus()));
                safeEvents.add(new SafeTrackingEvent(
                        ev.getStatus(),
                        evLabel,
                        blankToNull(ev.getLocation()),
                        blankToNull(ev.getDescription()),
                        blankToNull(ev.getTimestamp())
                ));
            }
        }

        SafeTrackingEvent latestEvent = safeEvents.isEmpty() ? null : safeEvents.get(safeEvents.size() - 1);

        return new ParcelTrackingOutcome(
                TrackingOutcomeStatus.SUCCESS,
                null,
                order.getTrackingNumber(),
                statusCode,
                statusLabel,
                statusMeaning,
                originArea,
                destinationArea,
                blankToNull(order.getOriginBranchName()),
                blankToNull(order.getDestinationBranchName()),
                blankToNull(order.getPickupMethod()),
                blankToNull(order.getParcelSize()),
                order.getWeightKg(),
                order.getFailedAttemptCount(),
                OrderLifecycleStatus.CANCELLED.name().equalsIgnoreCase(statusCode)
                        ? blankToNull(order.getCancellationReason())
                        : null,
                blankToNull(order.getDeliveredAt()),
                blankToNull(order.getUpdatedAt()),
                latestEvent,
                List.copyOf(safeEvents)
        );
    }

    private String serializeOutcome(ParcelTrackingOutcome outcome) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", outcome.status().name());
        if (outcome.trackingNumber() != null) {
            payload.put("trackingNumber", outcome.trackingNumber());
        }

        if (outcome.status() == TrackingOutcomeStatus.SUCCESS) {
            payload.put("lifecycleStatus", outcome.lifecycleStatus());
            payload.put("statusLabel", outcome.statusLabel());
            payload.put("statusMeaning", outcome.statusMeaning());
            if (outcome.originArea() != null) {
                payload.put("originArea", outcome.originArea());
            }
            if (outcome.destinationArea() != null) {
                payload.put("destinationArea", outcome.destinationArea());
            }
            if (outcome.originBranchName() != null) {
                payload.put("originBranchName", outcome.originBranchName());
            }
            if (outcome.destinationBranchName() != null) {
                payload.put("destinationBranchName", outcome.destinationBranchName());
            }
            if (outcome.pickupMethod() != null) {
                payload.put("pickupMethod", outcome.pickupMethod());
            }
            if (outcome.parcelSize() != null) {
                payload.put("parcelSize", outcome.parcelSize());
            }
            if (outcome.weightKg() != null) {
                payload.put("weightKg", outcome.weightKg());
            }
            if (outcome.failedAttemptCount() > 0) {
                payload.put("failedAttemptCount", outcome.failedAttemptCount());
            }
            if (outcome.cancellationReason() != null) {
                payload.put("cancellationReason", outcome.cancellationReason());
            }
            if (outcome.deliveredAt() != null) {
                payload.put("deliveredAt", outcome.deliveredAt());
            }
            if (outcome.updatedAt() != null) {
                payload.put("updatedAt", outcome.updatedAt());
            }
            if (outcome.latestEvent() != null) {
                payload.put("latestEvent", outcome.latestEvent());
            }
            payload.put("trackingEvents", outcome.trackingEvents());
        } else {
            payload.put("message", outcome.customerMessage());
        }

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            return "{\"status\":\"SERVICE_UNAVAILABLE\",\"message\":\"Unable to serialize tracking outcome\"}";
        }
    }

    private String extractRawTrackingArg(String argumentsJson) {
        if (argumentsJson == null || argumentsJson.isBlank()) {
            return null;
        }
        try {
            JsonNode args = objectMapper.readTree(argumentsJson);
            if (args != null && args.isObject() && args.hasNonNull("trackingNumber")) {
                return args.get("trackingNumber").asText();
            }
        } catch (Exception ex) {
            log.warn("Invalid JSON arguments received for tracking tool: {}", ex.getClass().getSimpleName());
        }
        return null;
    }

    private static String cleanArg(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (lower.equals("unknown")
                || lower.equals("unspecified")
                || lower.equals("not specified")
                || lower.equals("not provided")
                || lower.equals("none")
                || lower.equals("n/a")
                || lower.equals("null")) {
            return null;
        }
        return trimmed;
    }

    static Optional<String> normalizeValidTrackingNumber(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String upper = raw.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        if (!CONTAINS_DIGIT_PATTERN.matcher(upper).matches()) {
            return Optional.empty();
        }
        if (STRICT_NORMALIZED_TRACKING_PATTERN.matcher(upper).matches()) {
            return Optional.of(upper);
        }
        Matcher noHyphen = UNHYPHENATED_SD_PATTERN.matcher(upper);
        if (noHyphen.matches()) {
            return Optional.of("SD-" + noHyphen.group(1));
        }
        return Optional.empty();
    }

    private static Optional<String> extractFirstTrackingNumberFromText(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Matcher matcher = CONVERSATION_TRACKING_PATTERN.matcher(text);
        while (matcher.find()) {
            Optional<String> normalized = normalizeValidTrackingNumber(matcher.group(1));
            if (normalized.isPresent()) {
                return normalized;
            }
        }
        return Optional.empty();
    }

    private static Optional<String> extractLastTrackingNumberFromText(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        Matcher matcher = CONVERSATION_TRACKING_PATTERN.matcher(text);
        String latest = null;
        while (matcher.find()) {
            Optional<String> normalized = normalizeValidTrackingNumber(matcher.group(1));
            if (normalized.isPresent()) {
                latest = normalized.get();
            }
        }
        return Optional.ofNullable(latest);
    }

    private static String resolveDisplayLabel(String statusCode) {
        if (statusCode == null || statusCode.isBlank()) {
            return "Unknown";
        }
        try {
            return OrderLifecycleStatus.fromValue(statusCode).getDisplayLabel();
        } catch (IllegalArgumentException ex) {
            return statusCode;
        }
    }

    static String describeStatus(String statusCode) {
        if (statusCode == null || statusCode.isBlank()) {
            return "Your parcel status is recorded in the SwiftDrop system.";
        }
        OrderLifecycleStatus parsed;
        try {
            parsed = OrderLifecycleStatus.fromValue(statusCode);
        } catch (IllegalArgumentException ex) {
            return "Your parcel status is recorded as " + statusCode + ".";
        }
        return switch (parsed) {
            case CREATED -> "Your delivery request has been created and is awaiting confirmation.";
            case CONFIRMED -> "Your order is confirmed and being prepared for pickup or branch drop-off.";
            case PICKUP_ASSIGNED -> "A courier has been assigned to collect your parcel.";
            case PICKED_UP -> "A courier has collected your parcel and is taking it to the origin branch.";
            case AT_ORIGIN_BRANCH -> "Your parcel has arrived at the origin SwiftDrop branch and is awaiting dispatch.";
            case IN_TRANSIT -> "Your parcel is on the way between the origin branch and the destination branch.";
            case AT_DESTINATION_BRANCH -> "Your parcel has arrived at the destination branch and will be prepared for final delivery.";
            case OUT_FOR_DELIVERY -> "A courier is currently out to deliver your parcel to the recipient.";
            case DELIVERED -> "Your parcel has been delivered to the recipient.";
            case DELIVERY_FAILED -> "A delivery attempt was unsuccessful; SwiftDrop may retry delivery (up to 3 attempts).";
            case PENDING_DISPATCHER_DECISION -> "Delivery could not be completed after unsuccessful attempts and is awaiting a dispatcher review.";
            case RETURN_TO_SENDER -> "Your parcel is on its way back to the sender.";
            case RETURNED_TO_SENDER -> "Your parcel has been returned to the sender.";
            case CANCELLED -> "This delivery order has been cancelled.";
        };
    }

    private static String firstNonBlank(String primary, String fallback) {
        String p = blankToNull(primary);
        return p != null ? p : blankToNull(fallback);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

package com.swiftdrop.order.assistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolCall;
import com.swiftdrop.order.assistant.service.AssistantTrackingToolService.ExecutionTracker;
import com.swiftdrop.order.assistant.service.AssistantTrackingToolService.ParcelTrackingOutcome;
import com.swiftdrop.order.assistant.service.AssistantTrackingToolService.TrackingOutcomeStatus;
import com.swiftdrop.order.dto.DeliveryOrderResponse;
import com.swiftdrop.order.dto.DeliveryOrderResponse.TrackingEventDto;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.security.OrderUserPrincipal;
import com.swiftdrop.order.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssistantTrackingToolServiceTest {

    @Mock
    private OrderService orderService;

    private AssistantTrackingToolService trackingToolService;

    private static final OrderUserPrincipal CUSTOMER_A =
            new OrderUserPrincipal("cust-a", "a@swiftdrop.lk", null, List.of("CUSTOMER"));

    @BeforeEach
    void setUp() {
        trackingToolService = new AssistantTrackingToolService(orderService, new ObjectMapper());
    }

    private DeliveryOrderResponse sampleOrderResponse(String trackingNumber) {
        DeliveryOrderResponse order = new DeliveryOrderResponse();
        order.setId(101L);
        order.setTrackingNumber(trackingNumber);
        order.setStatus("IN_TRANSIT");
        order.setStatusLabel("In Transit");
        order.setCustomerUserId("cust-a");
        order.setCustomerEmail("a@swiftdrop.lk");
        order.setPickupCity("Colombo");
        order.setPickupAddress("120 Private Secret Street, Colombo");
        order.setPickupContactPhone("+94 77 111 2222");
        order.setDropoffCity("Kandy");
        order.setDropoffAddress("45 Private Home Road, Kandy");
        order.setDropoffContactPhone("+94 77 333 4444");
        order.setOriginBranchName("Colombo South");
        order.setDestinationBranchName("Kegalle Hub");
        order.setPickupMethod("COURIER_PICKUP");
        order.setParcelSize("MEDIUM");
        order.setWeightKg(new BigDecimal("2.50"));
        order.setUpdatedAt("2026-11-22T01:15:00");
        order.setCourierId("courier-99");
        order.setCourierPhone("+94 77 999 0000");
        order.setTrackingEvents(List.of(
                new TrackingEventDto(
                        1L,
                        "CREATED",
                        "Created",
                        "Colombo South",
                        "Order created",
                        "CUSTOMER",
                        "2026-11-21T10:00:00"
                ),
                new TrackingEventDto(
                        2L,
                        "IN_TRANSIT",
                        "In Transit",
                        "Kegalle Hub",
                        "Parcel departed origin branch toward destination hub",
                        "DISPATCHER",
                        "2026-11-22T01:10:00"
                )
        ));
        return order;
    }

    @Test
    void executeToolCall_ValidOwnedTrackingNumber_ReturnsRealStatusAndMinimizedPrivacySafePayload() {
        when(orderService.getOrderByIdOrTracking("SD-91001", CUSTOMER_A))
                .thenReturn(sampleOrderResponse("SD-91001"));

        ExecutionTracker tracker = new ExecutionTracker();
        String json = trackingToolService.executeToolCall(
                new LlmToolCall("call-1", AssistantTrackingToolService.TOOL_NAME, "{\"trackingNumber\":\"sd91001\"}"),
                CUSTOMER_A,
                "Where is parcel sd91001?",
                List.of(),
                tracker
        );

        assertThat(tracker.isInvoked()).isTrue();
        ParcelTrackingOutcome outcome = tracker.getLatestOutcome();
        assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.SUCCESS);
        assertThat(outcome.trackingNumber()).isEqualTo("SD-91001");
        assertThat(outcome.lifecycleStatus()).isEqualTo("IN_TRANSIT");
        assertThat(outcome.statusLabel()).isEqualTo("In Transit");
        assertThat(outcome.originArea()).isEqualTo("Colombo");
        assertThat(outcome.destinationArea()).isEqualTo("Kandy");
        assertThat(outcome.latestEvent().location()).isEqualTo("Kegalle Hub");
        assertThat(outcome.latestEvent().timestamp()).isEqualTo("2026-11-22T01:10:00");
        assertThat(outcome.trackingEvents()).hasSize(2);

        // Verify sensitive customer, phone, street address, and internal courier/actor metadata are never leaked
        assertThat(json)
                .contains("\"status\":\"SUCCESS\"")
                .contains("\"trackingNumber\":\"SD-91001\"")
                .contains("\"statusLabel\":\"In Transit\"")
                .doesNotContain("120 Private Secret Street")
                .doesNotContain("45 Private Home Road")
                .doesNotContain("+94 77")
                .doesNotContain("a@swiftdrop.lk")
                .doesNotContain("cust-a")
                .doesNotContain("courier-99")
                .doesNotContain("DISPATCHER");

        verify(orderService).getOrderByIdOrTracking("SD-91001", CUSTOMER_A);
    }

    @Test
    void lookupTracking_MissingTrackingNumberInMessageAndHistory_ReturnsMissingTrackingPrompt() {
        ParcelTrackingOutcome outcome = trackingToolService.lookupTracking(
                null,
                CUSTOMER_A,
                "Where is my parcel?",
                List.of(new LlmMessage("user", "Hello"), new LlmMessage("assistant", "Hi! How can I help?"))
        );

        assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.MISSING_TRACKING_NUMBER);
        assertThat(outcome.customerMessage()).contains("tracking number");
        verifyNoInteractions(orderService);
    }

    @Test
    void lookupTracking_FollowUpQuestionWithoutRepeatingCode_ResolvesTrackingNumberFromHistory() {
        when(orderService.getOrderByIdOrTracking("SD-88492", CUSTOMER_A))
                .thenReturn(sampleOrderResponse("SD-88492"));

        ExecutionTracker tracker = new ExecutionTracker();
        trackingToolService.executeToolCall(
                new LlmToolCall("call-2", AssistantTrackingToolService.TOOL_NAME, "{}"),
                CUSTOMER_A,
                "What was the last update for my delivery?",
                List.of(
                        new LlmMessage("user", "Track SD-88492"),
                        new LlmMessage("assistant", "Parcel SD-88492 is currently In Transit.")
                ),
                tracker
        );

        assertThat(tracker.getLatestOutcome().status()).isEqualTo(TrackingOutcomeStatus.SUCCESS);
        assertThat(tracker.getLatestOutcome().trackingNumber()).isEqualTo("SD-88492");
        verify(orderService).getOrderByIdOrTracking("SD-88492", CUSTOMER_A);
    }

    @Test
    void lookupTracking_InvalidTrackingNumberFormat_RejectedWithoutCallingOrderService() {
        for (String invalid : List.of("12345", "BAD-CODE", "SD-1", "SD-ABCDE")) {
            ParcelTrackingOutcome outcome = trackingToolService.lookupTracking(
                    invalid, CUSTOMER_A, "Track " + invalid, List.of()
            );
            assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.INVALID_TRACKING_NUMBER);
        }
        verifyNoInteractions(orderService);
    }

    @Test
    void lookupTracking_NotFound_ReturnsHelpfulNotFoundOutcome() {
        when(orderService.getOrderByIdOrTracking("SD-99999", CUSTOMER_A))
                .thenThrow(new ResourceNotFoundException("Order not found with identifier: SD-99999"));

        ParcelTrackingOutcome outcome = trackingToolService.lookupTracking(
                "SD-99999", CUSTOMER_A, "Where is SD-99999?", List.of()
        );

        assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.NOT_FOUND);
        assertThat(outcome.customerMessage()).contains("SD-99999").contains("couldn't find");
    }

    @Test
    void lookupTracking_AnotherCustomersParcel_EnforcesOwnershipAndDeniesWithoutLeakage() {
        when(orderService.getOrderByIdOrTracking("SD-77777", CUSTOMER_A))
                .thenThrow(new AccessDeniedException("You are not authorized to access another customer's order"));

        ParcelTrackingOutcome outcome = trackingToolService.lookupTracking(
                "SD-77777", CUSTOMER_A, "Check SD-77777", List.of()
        );

        assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.ACCESS_DENIED);
        assertThat(outcome.customerMessage())
                .contains("not associated with your customer account")
                .doesNotContain("Kandy")
                .doesNotContain("In Transit");
    }

    @Test
    void lookupTracking_OrderServiceFailure_ReturnsServiceUnavailableGracefully() {
        when(orderService.getOrderByIdOrTracking(anyString(), any(OrderUserPrincipal.class)))
                .thenThrow(new RuntimeException("Database connection failed"));

        ParcelTrackingOutcome outcome = trackingToolService.lookupTracking(
                "SD-91001", CUSTOMER_A, "Where is SD-91001?", List.of()
        );

        assertThat(outcome.status()).isEqualTo(TrackingOutcomeStatus.SERVICE_UNAVAILABLE);
        assertThat(outcome.customerMessage()).contains("temporarily unavailable");
    }
}

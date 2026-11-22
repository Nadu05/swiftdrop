package com.swiftdrop.order.assistant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolCall;
import com.swiftdrop.order.assistant.service.AssistantPricingToolService.ExecutionTracker;
import com.swiftdrop.order.assistant.service.AssistantPricingToolService.OutcomeStatus;
import com.swiftdrop.order.assistant.service.AssistantPricingToolService.PricingEstimateOutcome;
import com.swiftdrop.order.client.OrganizationServiceClient;
import com.swiftdrop.order.config.PricingProperties;
import com.swiftdrop.order.dto.BranchResolutionInfoDto;
import com.swiftdrop.order.dto.RouteBranchResolutionDto;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.ExternalServiceUnavailableException;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import com.swiftdrop.order.service.AddressCoordinateResolver;
import com.swiftdrop.order.service.PricingEngineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssistantPricingToolServiceTest {

    @Mock
    private OrganizationServiceClient organizationServiceClient;

    private PricingEngineService pricingEngineService;
    private AddressCoordinateResolver coordinateResolver;
    private AssistantPricingToolService toolService;

    @BeforeEach
    void setUp() {
        PricingProperties pricingProperties = new PricingProperties();
        pricingEngineService = spy(new PricingEngineService(pricingProperties));
        coordinateResolver = new AddressCoordinateResolver();
        toolService = new AssistantPricingToolService(
                pricingEngineService,
                coordinateResolver,
                organizationServiceClient,
                new ObjectMapper()
        );
    }

    @Test
    void evaluateToolArguments_ValidColomboToKandy2Kg_UsesPricingEngineAndFallsBackGracefullyOnBranchCoverage422() {
        when(organizationServiceClient.resolveRoute("00100", "20000"))
                .thenThrow(new InvalidBranchCoverageException(
                        "Destination postal code '20000' is not covered by any active branch",
                        "DESTINATION"
                ));

        ExecutionTracker tracker = new ExecutionTracker();
        String resultJson = toolService.executeToolCall(
                new LlmToolCall(
                        "call-1",
                        AssistantPricingToolService.TOOL_NAME,
                        "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"Kandy\",\"weightKg\":2}"
                ),
                tracker
        );

        assertThat(tracker.isInvoked()).isTrue();
        PricingEstimateOutcome outcome = tracker.getLatestOutcome();
        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SUCCESS);
        assertThat(outcome.currency()).isEqualTo("LKR");
        assertThat(outcome.parcelSize()).isEqualTo(ParcelSize.MEDIUM);
        assertThat(outcome.weightKg()).isEqualByComparingTo("2.00");
        assertThat(outcome.baseFee()).isEqualByComparingTo("450.00");
        assertThat(outcome.weightFee()).isEqualByComparingTo("120.00");
        assertThat(outcome.sizeSurcharge()).isEqualByComparingTo("250.00");
        assertThat(outcome.estimatedDistanceKm()).isGreaterThan(new BigDecimal("80.00"));
        assertThat(outcome.totalFee()).isEqualByComparingTo(
                outcome.baseFee().add(outcome.distanceFee()).add(outcome.weightFee()).add(outcome.sizeSurcharge())
        );
        assertThat(resultJson).contains("\"status\":\"SUCCESS\"", outcome.totalFee().toPlainString());

        verify(pricingEngineService).calculatePrice(anyDouble(), any(BigDecimal.class), any(ParcelSize.class));
    }

    @Test
    void evaluateToolArguments_ActiveBranchCoverage_UsesHubRouteDistanceFromOrganizationService() {
        BranchResolutionInfoDto origin = new BranchResolutionInfoDto(
                3L, "B001-CLB-S", "Colombo South", 1.5, true
        );
        BranchResolutionInfoDto dest = new BranchResolutionInfoDto(
                2L, "B001-KGL", "Kegalle", 2.0, true
        );
        RouteBranchResolutionDto route = new RouteBranchResolutionDto();
        route.setOriginBranch(origin);
        route.setDestinationBranch(dest);
        route.setInterBranchDistanceKm(96.5);
        route.setSameBranch(false);

        when(organizationServiceClient.resolveRoute("10350", "71000")).thenReturn(route);

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Dehiwala\",\"destinationLocation\":\"Kegalle\",\"weightKg\":3.5,\"parcelSize\":\"LARGE\"}"
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SUCCESS);
        assertThat(outcome.parcelSize()).isEqualTo(ParcelSize.LARGE);
        assertThat(outcome.originBranchName()).isEqualTo("Colombo South");
        assertThat(outcome.destinationBranchName()).isEqualTo("Kegalle");
        assertThat(outcome.estimatedDistanceKm()).isEqualByComparingTo("100.00");
        assertThat(outcome.sizeSurcharge()).isEqualByComparingTo("650.00");
        // base 450 + dist (100 * 65 = 6500) + weight ((3.5 - 1) * 120 = 300) + large 650 = 7900.00
        assertThat(outcome.totalFee()).isEqualByComparingTo("7900.00");
    }

    @Test
    void evaluateToolArguments_MissingRequiredFields_ReturnsMissingInputWithoutCallingPricingEngine() {
        PricingEstimateOutcome missingPickupAndWeight = toolService.evaluateToolArguments(
                "{\"destinationLocation\":\"Kandy\"}"
        );
        assertThat(missingPickupAndWeight.status()).isEqualTo(OutcomeStatus.MISSING_INPUT);
        assertThat(missingPickupAndWeight.customerMessage())
                .contains("pickup location")
                .contains("parcel weight");

        PricingEstimateOutcome placeholderPickup = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"unknown\",\"destinationLocation\":\"Kandy\",\"weightKg\":2}"
        );
        assertThat(placeholderPickup.status()).isEqualTo(OutcomeStatus.MISSING_INPUT);
        assertThat(placeholderPickup.customerMessage()).contains("pickup location");

        verifyNoInteractions(organizationServiceClient);
        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }

    @Test
    void evaluateToolArguments_InvalidWeightOrSizeOrJson_ReturnsInvalidInputWithoutCallingPricingEngine() {
        PricingEstimateOutcome zeroWeight = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"Kandy\",\"weightKg\":0}"
        );
        assertThat(zeroWeight.status()).isEqualTo(OutcomeStatus.INVALID_INPUT);
        assertThat(zeroWeight.customerMessage()).contains("0.01 kg and 500.00 kg");

        PricingEstimateOutcome excessiveWeight = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"Kandy\",\"weightKg\":505}"
        );
        assertThat(excessiveWeight.status()).isEqualTo(OutcomeStatus.INVALID_INPUT);
        assertThat(excessiveWeight.customerMessage()).contains("500.00 kg");

        PricingEstimateOutcome badSize = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"Kandy\",\"weightKg\":2,\"parcelSize\":\"GIGANTIC\"}"
        );
        assertThat(badSize.status()).isEqualTo(OutcomeStatus.INVALID_INPUT);
        assertThat(badSize.customerMessage()).contains("Unsupported parcel size");

        PricingEstimateOutcome malformedJson = toolService.evaluateToolArguments("{bad-json");
        assertThat(malformedJson.status()).isEqualTo(OutcomeStatus.INVALID_INPUT);

        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }

    @Test
    void evaluateToolArguments_UnknownDestinationOrUncoveredRawPostalCode_ReturnsUnsupportedLocation() {
        PricingEstimateOutcome internationalDest = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"London\",\"weightKg\":2}"
        );
        assertThat(internationalDest.status()).isEqualTo(OutcomeStatus.UNSUPPORTED_LOCATION);
        assertThat(internationalDest.customerMessage()).contains("London").contains("Sri Lanka");

        when(organizationServiceClient.resolveRoute("00100", "99999"))
                .thenThrow(new InvalidBranchCoverageException(
                        "Destination postal code '99999' is not covered by any active branch",
                        "DESTINATION"
                ));

        PricingEstimateOutcome unknownPostal = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"99999\",\"weightKg\":2}"
        );
        assertThat(unknownPostal.status()).isEqualTo(OutcomeStatus.UNSUPPORTED_LOCATION);
        assertThat(unknownPostal.customerMessage()).contains("99999");

        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }

    @Test
    void evaluateToolArguments_PricingEngineFailure_ReturnsServiceUnavailableGracefully() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenThrow(new InvalidBranchCoverageException("Not mapped", "DESTINATION"));
        doThrow(new IllegalStateException("Pricing failure"))
                .when(pricingEngineService)
                .calculatePrice(anyDouble(), any(BigDecimal.class), any(ParcelSize.class));

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"Kandy\",\"weightKg\":2}"
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SERVICE_UNAVAILABLE);
        assertThat(outcome.customerMessage()).contains("temporarily unable to calculate");
        assertThat(outcome.totalFee()).isNull();
    }

    @Test
    void evaluateToolArguments_RawPostalCodeAndOrgServiceDown_ReturnsServiceUnavailable() {
        when(organizationServiceClient.resolveRoute("00100", "99999"))
                .thenThrow(new ExternalServiceUnavailableException("Organization service down"));

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\",\"destinationLocation\":\"99999\",\"weightKg\":2}"
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SERVICE_UNAVAILABLE);
        assertThat(outcome.customerMessage()).contains("temporarily unavailable");
        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }

    @Test
    void evaluateToolArguments_FollowUpWeightChange_ReusesRouteFromHistory() {
        RouteBranchResolutionDto route = new RouteBranchResolutionDto();
        route.setOriginBranch(new BranchResolutionInfoDto(1L, "B001-CMB", "Colombo Hub", 1.5, true));
        route.setDestinationBranch(new BranchResolutionInfoDto(2L, "B002-KDY", "Kandy Hub", 2.0, true));
        route.setInterBranchDistanceKm(115.0);
        route.setSameBranch(false);
        when(organizationServiceClient.resolveRoute("00100", "20000")).thenReturn(route);

        List<LlmMessage> history = List.of(
                new LlmMessage("user", "How much to send 3 kg from Colombo to Kandy?"),
                new LlmMessage("assistant", "Estimated delivery fee for a 3 kg medium parcel from Colombo to Kandy: LKR 2,500.00.")
        );

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"weightKg\":5}",
                "What about 5 kg?",
                history
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SUCCESS);
        assertThat(outcome.pickupLocation()).isEqualTo("Colombo");
        assertThat(outcome.destinationLocation()).isEqualTo("Kandy");
        assertThat(outcome.weightKg()).isEqualByComparingTo("5");
        assertThat(outcome.totalFee()).isPositive();
    }

    @Test
    void evaluateToolArguments_FollowUpDestinationChange_ReusesPickupAndWeightFromHistory() {
        RouteBranchResolutionDto route = new RouteBranchResolutionDto();
        route.setOriginBranch(new BranchResolutionInfoDto(1L, "B001-CMB", "Colombo Hub", 1.5, true));
        route.setDestinationBranch(new BranchResolutionInfoDto(3L, "B003-GAL", "Galle Hub", 2.0, true));
        route.setInterBranchDistanceKm(120.0);
        route.setSameBranch(false);
        when(organizationServiceClient.resolveRoute("00100", "80000")).thenReturn(route);

        List<LlmMessage> history = List.of(
                new LlmMessage("user", "How much to send 3 kg from Colombo to Kandy?"),
                new LlmMessage("assistant", "Estimated delivery fee for a 3 kg medium parcel from Colombo to Kandy: LKR 2,500.00.")
        );

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"destinationLocation\":\"Galle\"}",
                "What if it's to Galle instead?",
                history
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.SUCCESS);
        assertThat(outcome.pickupLocation()).isEqualTo("Colombo");
        assertThat(outcome.destinationLocation()).isEqualTo("Galle");
        assertThat(outcome.weightKg()).isEqualByComparingTo("3");
    }

    @Test
    void evaluateToolArguments_FollowUpMissingPickup_RetainsKnownDestinationAndWeight() {
        List<LlmMessage> history = List.of(
                new LlmMessage("user", "How much to send 3 kg to Kandy?"),
                new LlmMessage("assistant", "To calculate your exact delivery fee estimate, please tell me your pickup location.")
        );

        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"weightKg\":5}",
                "What about 5 kg?",
                history
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.MISSING_INPUT);
        assertThat(outcome.customerMessage())
                .contains("pickup location")
                .contains("Kandy")
                .contains("5 kg");
        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }

    @Test
    void evaluateToolArguments_ControlCharOrOverlongArgument_ReturnsInvalidInput() {
        PricingEstimateOutcome outcome = toolService.evaluateToolArguments(
                "{\"pickupLocation\":\"Colombo\\u0000\",\"destinationLocation\":\"Kandy\",\"weightKg\":2}"
        );

        assertThat(outcome.status()).isEqualTo(OutcomeStatus.INVALID_INPUT);
        verify(pricingEngineService, never()).calculatePrice(anyDouble(), any(), any());
    }
}

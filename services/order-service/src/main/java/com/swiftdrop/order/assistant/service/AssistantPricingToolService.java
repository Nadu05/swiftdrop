package com.swiftdrop.order.assistant.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.TextNode;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolCall;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolDefinition;
import com.swiftdrop.order.client.OrganizationServiceClient;
import com.swiftdrop.order.dto.RouteBranchResolutionDto;
import com.swiftdrop.order.entity.enums.ParcelSize;
import com.swiftdrop.order.exception.ExternalServiceUnavailableException;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import com.swiftdrop.order.service.AddressCoordinateResolver;
import com.swiftdrop.order.service.PricingEngineService;
import com.swiftdrop.order.service.PricingEngineService.PricingCalculationResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validated backend tool executor bridging the AI Assistant to SwiftDrop's authoritative pricing engine.
 * Enforces strict argument validation, Sri Lankan location resolution, and deterministic fee calculation.
 */
@Service
public class AssistantPricingToolService {

    private static final Logger log = LoggerFactory.getLogger(AssistantPricingToolService.class);

    public static final String TOOL_NAME = "estimate_delivery_price";
    private static final BigDecimal MIN_WEIGHT_KG = new BigDecimal("0.01");
    private static final BigDecimal MAX_WEIGHT_KG = new BigDecimal("500.00");
    private static final int MAX_LOCATION_ARG_LENGTH = 160;
    private static final Pattern POSTAL_CODE_PATTERN = Pattern.compile("\\b(\\d{5})\\b");
    private static final Pattern FROM_TO_LOCATION_PATTERN = Pattern.compile(
            "(?i)\\bfrom\\s+([A-Za-z0-9][A-Za-z0-9\\s,.()-]{1,45}?)\\s+to\\s+([A-Za-z0-9][A-Za-z0-9\\s,.()-]{1,45}?)(?=$|[:;,.!?]|\\s+(?:for|with|weighing|at|on|is|and|or|provisional)\\b)"
    );
    private static final Pattern FROM_ONLY_LOCATION_PATTERN = Pattern.compile(
            "(?i)\\bfrom\\s+([A-Za-z0-9][A-Za-z0-9\\s,.()-]{1,45}?)(?=$|[:;,.!?]|\\s+(?:to|for|with|weighing|at|on|is|and|or|instead)\\b)"
    );
    private static final Pattern TO_ONLY_LOCATION_PATTERN = Pattern.compile(
            "(?i)\\bto\\s+([A-Za-z0-9][A-Za-z0-9\\s,.()-]{1,45}?)(?=$|[:;,.!?]|\\s+(?:from|for|with|weighing|at|on|is|and|or|instead)\\b)"
    );
    private static final Pattern WEIGHT_INFERENCE_PATTERN = Pattern.compile(
            "(?i)\\b(\\d+(?:\\.\\d+)?)\\s*(?:kg|kgs|kilograms?)\\b"
    );
    private static final Pattern PARCEL_SIZE_INFERENCE_PATTERN = Pattern.compile(
            "(?i)\\b(extra[\\s_-]*large|small|medium|large)\\b(?=\\s+(?:parcel|package|box|size|delivery)\\b|\\s*$)"
    );
    private static final Pattern TRACKING_SUMMARY_PATTERN = Pattern.compile(
            "(?i)\\btracking number:|\\bcurrent status:|\\btracking unavailable\\b"
    );

    private static final Map<String, ResolvedLocation> LOCATION_DIRECTORY = buildLocationDirectory();
    private static final List<Map.Entry<String, ResolvedLocation>> ORDERED_LOCATION_ENTRIES =
            LOCATION_DIRECTORY.entrySet().stream()
                    .sorted(Comparator.<Map.Entry<String, ResolvedLocation>>comparingInt(
                            e -> e.getKey().length()).reversed())
                    .toList();

    public enum OutcomeStatus {
        SUCCESS,
        MISSING_INPUT,
        INVALID_INPUT,
        UNSUPPORTED_LOCATION,
        SERVICE_UNAVAILABLE
    }

    public record PricingEstimateOutcome(
            OutcomeStatus status,
            String customerMessage,
            BigDecimal totalFee,
            String currency,
            BigDecimal estimatedDistanceKm,
            BigDecimal baseFee,
            BigDecimal distanceFee,
            BigDecimal weightFee,
            BigDecimal sizeSurcharge,
            BigDecimal weightKg,
            ParcelSize parcelSize,
            String pickupLocation,
            String destinationLocation,
            String originBranchName,
            String destinationBranchName,
            boolean provisional
    ) {
        public static PricingEstimateOutcome error(OutcomeStatus status, String customerMessage) {
            return new PricingEstimateOutcome(
                    status,
                    customerMessage,
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
                    null,
                    null,
                    null,
                    true
            );
        }

        public String toFormattedSummary() {
            if (status != OutcomeStatus.SUCCESS || totalFee == null) {
                return customerMessage;
            }
            StringBuilder sb = new StringBuilder();
            sb.append(String.format(
                    Locale.US,
                    "Estimated delivery fee for a %s kg %s parcel from %s to %s: %s %,.2f",
                    weightKg.stripTrailingZeros().toPlainString(),
                    parcelSize.getLabel().toLowerCase(Locale.ROOT),
                    pickupLocation,
                    destinationLocation,
                    currency,
                    totalFee
            ));
            if (provisional) {
                sb.append(" (provisional estimate)");
            }
            sb.append(".\n\nFee breakdown:\n");
            sb.append(String.format(Locale.US, "- Base fee: %s %,.2f\n", currency, baseFee));
            sb.append(String.format(
                    Locale.US,
                    "- Distance fee (%s km): %s %,.2f\n",
                    estimatedDistanceKm.stripTrailingZeros().toPlainString(),
                    currency,
                    distanceFee
            ));
            sb.append(String.format(Locale.US, "- Weight fee: %s %,.2f\n", currency, weightFee));
            sb.append(String.format(Locale.US, "- Size surcharge: %s %,.2f", currency, sizeSurcharge));
            return sb.toString();
        }
    }

    public static final class ExecutionTracker {
        private PricingEstimateOutcome latestOutcome;
        private boolean invoked;

        public void record(PricingEstimateOutcome outcome) {
            this.invoked = true;
            this.latestOutcome = outcome;
        }

        public boolean isInvoked() {
            return invoked;
        }

        public PricingEstimateOutcome getLatestOutcome() {
            return latestOutcome;
        }
    }

    private record ResolvedLocation(
            String displayName,
            String postalCode,
            double latitude,
            double longitude
    ) {
    }

    private final PricingEngineService pricingEngineService;
    private final AddressCoordinateResolver coordinateResolver;
    private final OrganizationServiceClient organizationServiceClient;
    private final ObjectMapper objectMapper;

    public AssistantPricingToolService(
            PricingEngineService pricingEngineService,
            AddressCoordinateResolver addressCoordinateResolver,
            OrganizationServiceClient organizationServiceClient,
            ObjectMapper objectMapper) {
        this.pricingEngineService = pricingEngineService;
        this.coordinateResolver = addressCoordinateResolver;
        this.organizationServiceClient = organizationServiceClient;
        this.objectMapper = objectMapper;
    }

    public LlmToolDefinition getToolDefinition() {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("pickupLocation", Map.of(
                "type", "string",
                "description", "Pickup city, area, district, or 5-digit Sri Lankan postal code (e.g. Colombo, Dehiwala, 10350)"
        ));
        properties.put("destinationLocation", Map.of(
                "type", "string",
                "description", "Destination city, area, district, or 5-digit Sri Lankan postal code (e.g. Kandy, Galle, 20000)"
        ));
        properties.put("weightKg", Map.of(
                "type", "number",
                "description", "Parcel weight in kilograms (between 0.01 and 500.00)"
        ));
        properties.put("parcelSize", Map.of(
                "type", "string",
                "enum", List.of("SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"),
                "description", "Optional parcel size category; defaults to MEDIUM if omitted"
        ));

        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("type", "object");
        parameters.put("properties", properties);
        parameters.put("required", List.of("pickupLocation", "destinationLocation", "weightKg"));

        return new LlmToolDefinition(
                TOOL_NAME,
                "Calculate the real SwiftDrop delivery fee estimate using pickup location, destination location, parcel weight in kg, and optional parcel size. Only call when pickup location, destination location, and parcel weight have been provided by the customer.",
                parameters
        );
    }

    public String executeToolCall(LlmToolCall toolCall, ExecutionTracker tracker) {
        return executeToolCall(toolCall, null, List.of(), tracker);
    }

    public String executeToolCall(
            LlmToolCall toolCall,
            String userMessage,
            List<LlmMessage> history,
            ExecutionTracker tracker) {
        if (toolCall == null || !TOOL_NAME.equals(toolCall.name())) {
            PricingEstimateOutcome unsupportedTool = PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    "Only delivery fee estimation is supported right now."
            );
            if (tracker != null) {
                tracker.record(unsupportedTool);
            }
            return serializeOutcome(unsupportedTool);
        }

        PricingEstimateOutcome outcome = evaluateToolArguments(toolCall.argumentsJson(), userMessage, history);
        if (tracker != null) {
            tracker.record(outcome);
        }
        return serializeOutcome(outcome);
    }

    public PricingEstimateOutcome evaluateToolArguments(String argumentsJson) {
        return evaluateToolArguments(argumentsJson, null, List.of());
    }

    public PricingEstimateOutcome evaluateToolArguments(
            String argumentsJson,
            String userMessage,
            List<LlmMessage> history) {
        boolean hasConversationContext = (userMessage != null && !userMessage.isBlank())
                || (history != null && !history.isEmpty());

        if (argumentsJson == null || argumentsJson.isBlank()) {
            if (!hasConversationContext) {
                return PricingEstimateOutcome.error(
                        OutcomeStatus.MISSING_INPUT,
                        "Please provide your pickup location, destination location, and parcel weight (in kg) so I can calculate an accurate delivery fee estimate."
                );
            }
            argumentsJson = "{}";
        }

        JsonNode args;
        try {
            args = objectMapper.readTree(argumentsJson);
        } catch (Exception ex) {
            log.warn("Invalid JSON arguments received for pricing tool: {}", ex.getClass().getSimpleName());
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    "I couldn't read the delivery details properly. Please provide your pickup location, destination location, and parcel weight in kg."
            );
        }

        if (!args.isObject()) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    "Please provide your pickup location, destination location, and parcel weight in kg."
            );
        }

        JsonNode pickupNode = args.get("pickupLocation");
        JsonNode destinationNode = args.get("destinationLocation");
        JsonNode weightNode = args.get("weightKg");
        JsonNode sizeNode = args.get("parcelSize");

        if (hasUnsafeTextNode(pickupNode) || hasUnsafeTextNode(destinationNode) || hasUnsafeTextNode(sizeNode)) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    "Please provide concise location names (city, area, or 5-digit postal code) and parcel weight in kg."
            );
        }

        String rawPickup = readTextArg(pickupNode);
        String rawDestination = readTextArg(destinationNode);
        String rawSize = readTextArg(sizeNode);

        boolean usedConversationContext = false;
        if (hasConversationContext) {
            PricingContextHints hints = inferPricingContext(userMessage, history);
            if (isMissingLocation(rawPickup) && hints.pickupLocation() != null) {
                rawPickup = hints.pickupLocation();
                usedConversationContext = true;
            }
            if (isMissingLocation(rawDestination) && hints.destinationLocation() != null) {
                rawDestination = hints.destinationLocation();
                usedConversationContext = true;
            }
            if (isMissingWeightNode(weightNode) && hints.weightText() != null) {
                weightNode = TextNode.valueOf(hints.weightText());
                usedConversationContext = true;
            }
            if ((rawSize == null || rawSize.isBlank()) && hints.parcelSize() != null) {
                rawSize = hints.parcelSize();
            }
        }

        List<String> missingFields = new ArrayList<>();
        if (isMissingLocation(rawPickup)) {
            missingFields.add("pickup location");
        }
        if (isMissingLocation(rawDestination)) {
            missingFields.add("destination location");
        }
        if (isMissingWeightNode(weightNode)) {
            missingFields.add("parcel weight (in kg)");
        }

        if (!missingFields.isEmpty()) {
            String knownPickup = isMissingLocation(rawPickup) ? null : rawPickup;
            String knownDestination = isMissingLocation(rawDestination) ? null : rawDestination;
            BigDecimal knownWeight = tryParsePositiveWeight(weightNode);
            String prompt = usedConversationContext
                    ? buildContextualMissingFieldsPrompt(missingFields, knownPickup, knownDestination, knownWeight)
                    : buildMissingFieldsPrompt(missingFields);
            return PricingEstimateOutcome.error(OutcomeStatus.MISSING_INPUT, prompt);
        }

        BigDecimal weightKg;
        try {
            weightKg = parsePositiveWeight(weightNode);
        } catch (IllegalArgumentException ex) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    ex.getMessage()
            );
        }

        ParcelSize parcelSize;
        try {
            parcelSize = parseParcelSize(rawSize);
        } catch (IllegalArgumentException ex) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    ex.getMessage()
            );
        }

        return calculateAuthorizedEstimate(rawPickup, rawDestination, weightKg, parcelSize);
    }

    public PricingEstimateOutcome calculateAuthorizedEstimate(
            String rawPickup,
            String rawDestination,
            BigDecimal weightKg,
            ParcelSize parcelSize) {

        if (weightKg == null || weightKg.compareTo(MIN_WEIGHT_KG) < 0 || weightKg.compareTo(MAX_WEIGHT_KG) > 0) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    "Parcel weight must be between 0.01 kg and 500.00 kg."
            );
        }

        Optional<ResolvedLocation> maybePickup = resolveLocation(rawPickup);
        if (maybePickup.isEmpty()) {
            String rawPostal = extractPostalCode(rawPickup);
            if (rawPostal == null) {
                return PricingEstimateOutcome.error(
                        OutcomeStatus.UNSUPPORTED_LOCATION,
                        "I couldn't recognize the pickup location '" + rawPickup.trim()
                                + "' as a supported SwiftDrop delivery area in Sri Lanka. Please provide a valid Sri Lankan city, town, or 5-digit postal code (for example: Colombo, Dehiwala, or 10350)."
                );
            }
            maybePickup = Optional.of(new ResolvedLocation(
                    "Postal Area " + rawPostal,
                    rawPostal,
                    Double.NaN,
                    Double.NaN
            ));
        }

        Optional<ResolvedLocation> maybeDestination = resolveLocation(rawDestination);
        if (maybeDestination.isEmpty()) {
            String rawPostal = extractPostalCode(rawDestination);
            if (rawPostal == null) {
                return PricingEstimateOutcome.error(
                        OutcomeStatus.UNSUPPORTED_LOCATION,
                        "I couldn't recognize the destination location '" + rawDestination.trim()
                                + "' as a supported SwiftDrop delivery area in Sri Lanka. Please provide a valid Sri Lankan city, town, or 5-digit postal code (for example: Kandy, Galle, or 20000)."
                );
            }
            maybeDestination = Optional.of(new ResolvedLocation(
                    "Postal Area " + rawPostal,
                    rawPostal,
                    Double.NaN,
                    Double.NaN
            ));
        }

        ResolvedLocation pickup = maybePickup.get();
        ResolvedLocation destination = maybeDestination.get();
        boolean hasKnownPickupCoords = !Double.isNaN(pickup.latitude()) && !Double.isNaN(pickup.longitude());
        boolean hasKnownDestCoords = !Double.isNaN(destination.latitude()) && !Double.isNaN(destination.longitude());

        String originBranchName = null;
        String destinationBranchName = null;
        double effectiveDistanceKm = hasKnownPickupCoords && hasKnownDestCoords
                ? coordinateResolver.calculateDistanceKm(
                        pickup.latitude(),
                        pickup.longitude(),
                        destination.latitude(),
                        destination.longitude()
                )
                : 0.5;

        if (pickup.postalCode() != null && destination.postalCode() != null) {
            try {
                RouteBranchResolutionDto route = organizationServiceClient.resolveRoute(
                        pickup.postalCode(),
                        destination.postalCode()
                );
                if (route != null && route.getOriginBranch() != null && route.getDestinationBranch() != null) {
                    originBranchName = route.getOriginBranch().getBranchName();
                    destinationBranchName = route.getDestinationBranch().getBranchName();
                    double pickupToOrigin = route.getOriginBranch().getDistanceKm() != null
                            ? route.getOriginBranch().getDistanceKm()
                            : 0.0;
                    double interBranch = route.getInterBranchDistanceKm() != null
                            ? route.getInterBranchDistanceKm()
                            : 0.0;
                    double destToBranch = route.getDestinationBranch().getDistanceKm() != null
                            ? route.getDestinationBranch().getDistanceKm()
                            : 0.0;
                    double hubRouteDistance = pickupToOrigin + interBranch + destToBranch;
                    effectiveDistanceKm = Math.max(effectiveDistanceKm, Math.max(0.5, hubRouteDistance));
                }
            } catch (InvalidBranchCoverageException ex) {
                if (!hasKnownPickupCoords || !hasKnownDestCoords) {
                    return PricingEstimateOutcome.error(
                            OutcomeStatus.UNSUPPORTED_LOCATION,
                            ex.getMessage()
                    );
                }
                log.debug("Falling back to validated Sri Lankan coordinates for estimate ({} -> {}): {}",
                        pickup.displayName(), destination.displayName(), ex.getMessage());
            } catch (ExternalServiceUnavailableException ex) {
                if (!hasKnownPickupCoords || !hasKnownDestCoords) {
                    return PricingEstimateOutcome.error(
                            OutcomeStatus.SERVICE_UNAVAILABLE,
                            "Sorry, our location coverage service is temporarily unavailable to verify those postal codes. Please try again in a moment."
                    );
                }
                log.warn("Organization Service unavailable while resolving route ({} -> {}); using coordinate distance",
                        pickup.displayName(), destination.displayName());
            }
        }

        if (pickup.displayName().equalsIgnoreCase(destination.displayName())) {
            effectiveDistanceKm = Math.max(effectiveDistanceKm, 2.0);
        }

        try {
            ParcelSize effectiveSize = parcelSize != null ? parcelSize : ParcelSize.MEDIUM;
            PricingCalculationResult calc = pricingEngineService.calculatePrice(
                    effectiveDistanceKm,
                    weightKg,
                    effectiveSize
            );

            return new PricingEstimateOutcome(
                    OutcomeStatus.SUCCESS,
                    null,
                    calc.totalFee(),
                    calc.currency(),
                    calc.distanceKm(),
                    calc.baseFee(),
                    calc.distanceFee(),
                    calc.weightFee(),
                    calc.sizeSurcharge(),
                    weightKg.setScale(2, RoundingMode.HALF_UP),
                    effectiveSize,
                    pickup.displayName(),
                    destination.displayName(),
                    originBranchName,
                    destinationBranchName,
                    calc.provisional()
            );
        } catch (IllegalArgumentException ex) {
            return PricingEstimateOutcome.error(
                    OutcomeStatus.INVALID_INPUT,
                    ex.getMessage()
            );
        } catch (Exception ex) {
            log.error("Authoritative pricing calculation failed: {}", ex.getClass().getSimpleName());
            return PricingEstimateOutcome.error(
                    OutcomeStatus.SERVICE_UNAVAILABLE,
                    "Sorry, I'm temporarily unable to calculate the delivery fee right now. Please try again in a moment or check the Create Delivery page."
            );
        }
    }

    private String serializeOutcome(PricingEstimateOutcome outcome) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", outcome.status().name());
        if (outcome.status() == OutcomeStatus.SUCCESS) {
            payload.put("totalFee", outcome.totalFee());
            payload.put("currency", outcome.currency());
            payload.put("estimatedDistanceKm", outcome.estimatedDistanceKm());
            payload.put("baseFee", outcome.baseFee());
            payload.put("distanceFee", outcome.distanceFee());
            payload.put("weightFee", outcome.weightFee());
            payload.put("sizeSurcharge", outcome.sizeSurcharge());
            payload.put("weightKg", outcome.weightKg());
            payload.put("parcelSize", outcome.parcelSize().name());
            payload.put("pickupLocation", outcome.pickupLocation());
            payload.put("destinationLocation", outcome.destinationLocation());
            if (outcome.originBranchName() != null) {
                payload.put("originBranchName", outcome.originBranchName());
            }
            if (outcome.destinationBranchName() != null) {
                payload.put("destinationBranchName", outcome.destinationBranchName());
            }
            payload.put("provisionalPricing", outcome.provisional());
        } else {
            payload.put("message", outcome.customerMessage());
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            return "{\"status\":\"SERVICE_UNAVAILABLE\",\"message\":\"Unable to serialize pricing outcome\"}";
        }
    }

    private BigDecimal parsePositiveWeight(JsonNode weightNode) {
        BigDecimal weight;
        try {
            if (weightNode.isNumber()) {
                weight = weightNode.decimalValue();
            } else if (weightNode.isTextual()) {
                String cleaned = weightNode.asText().trim().toLowerCase(Locale.ROOT)
                        .replace("kilograms", "")
                        .replace("kilogram", "")
                        .replace("kgs", "")
                        .replace("kg", "")
                        .trim();
                weight = new BigDecimal(cleaned);
            } else {
                throw new IllegalArgumentException("Please provide parcel weight as a valid number in kg.");
            }
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Please provide parcel weight as a valid number in kg.");
        }

        if (weight.compareTo(MIN_WEIGHT_KG) < 0 || weight.compareTo(MAX_WEIGHT_KG) > 0) {
            throw new IllegalArgumentException("Parcel weight must be between 0.01 kg and 500.00 kg.");
        }
        return weight;
    }

    private ParcelSize parseParcelSize(String rawSize) {
        if (rawSize == null || rawSize.isBlank()) {
            return ParcelSize.MEDIUM;
        }
        try {
            return ParcelSize.fromValue(rawSize);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Unsupported parcel size '" + rawSize.trim() + "'. Supported sizes are SMALL, MEDIUM, LARGE, and EXTRA_LARGE."
            );
        }
    }

    private String readTextArg(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        return node.asText().trim();
    }

    private record PricingContextHints(
            String pickupLocation,
            String destinationLocation,
            String weightText,
            String parcelSize
    ) {
    }

    private PricingContextHints inferPricingContext(String userMessage, List<LlmMessage> history) {
        List<String> chronologicalNewestFirst = new ArrayList<>();
        if (userMessage != null && !userMessage.isBlank()) {
            chronologicalNewestFirst.add(userMessage.trim());
        }
        if (history != null && !history.isEmpty()) {
            for (int i = history.size() - 1; i >= 0; i--) {
                LlmMessage msg = history.get(i);
                if (msg != null && msg.content() != null && !msg.content().isBlank()) {
                    chronologicalNewestFirst.add(msg.content().trim());
                }
            }
        }

        String pickup = null;
        String destination = null;
        String weightText = null;
        String parcelSize = null;

        for (String text : chronologicalNewestFirst) {
            if (TRACKING_SUMMARY_PATTERN.matcher(text).find()) {
                continue;
            }

            if (pickup == null || destination == null) {
                Matcher fromTo = FROM_TO_LOCATION_PATTERN.matcher(text);
                while (fromTo.find()) {
                    String candPickup = fromTo.group(1).trim();
                    String candDest = fromTo.group(2).trim();
                    if (pickup == null && isResolvableLocation(candPickup)) {
                        pickup = candPickup;
                    }
                    if (destination == null && isResolvableLocation(candDest)) {
                        destination = candDest;
                    }
                }
            }

            if (pickup == null) {
                Matcher fromOnly = FROM_ONLY_LOCATION_PATTERN.matcher(text);
                int pos = 0;
                while (pos < text.length() && fromOnly.find(pos)) {
                    String candPickup = fromOnly.group(1).trim();
                    if (isResolvableLocation(candPickup)) {
                        pickup = candPickup;
                        break;
                    }
                    pos = fromOnly.start() + 1;
                }
            }

            if (destination == null) {
                Matcher toOnly = TO_ONLY_LOCATION_PATTERN.matcher(text);
                int pos = 0;
                while (pos < text.length() && toOnly.find(pos)) {
                    String candDest = toOnly.group(1).trim();
                    if (isResolvableLocation(candDest)) {
                        destination = candDest;
                        break;
                    }
                    pos = toOnly.start() + 1;
                }
            }

            if (weightText == null) {
                Matcher weightMatcher = WEIGHT_INFERENCE_PATTERN.matcher(text);
                if (weightMatcher.find()) {
                    String candWeight = weightMatcher.group(1);
                    if (tryParsePositiveWeight(TextNode.valueOf(candWeight)) != null) {
                        weightText = candWeight;
                    }
                }
            }

            if (parcelSize == null) {
                Matcher sizeMatcher = PARCEL_SIZE_INFERENCE_PATTERN.matcher(text);
                if (sizeMatcher.find()) {
                    parcelSize = sizeMatcher.group(1)
                            .trim()
                            .toUpperCase(Locale.ROOT)
                            .replaceAll("[\\s-]+", "_");
                }
            }

            if (pickup != null && destination != null && weightText != null && parcelSize != null) {
                break;
            }
        }

        return new PricingContextHints(pickup, destination, weightText, parcelSize);
    }

    private boolean isResolvableLocation(String candidate) {
        if (candidate == null || candidate.isBlank() || candidate.length() > MAX_LOCATION_ARG_LENGTH) {
            return false;
        }
        return resolveLocation(candidate).isPresent() || extractPostalCode(candidate) != null;
    }

    private boolean hasUnsafeTextNode(JsonNode node) {
        return node != null && !node.isNull() && hasUnsafeTextArgument(node.asText());
    }

    private boolean hasUnsafeTextArgument(String value) {
        if (value == null) {
            return false;
        }
        if (value.length() > MAX_LOCATION_ARG_LENGTH) {
            return true;
        }
        for (int i = 0; i < value.length(); i++) {
            if (Character.isISOControl(value.charAt(i))) {
                return true;
            }
        }
        return false;
    }

    private boolean isMissingWeightNode(JsonNode weightNode) {
        return weightNode == null || weightNode.isNull()
                || (weightNode.isTextual() && weightNode.asText().isBlank());
    }

    private BigDecimal tryParsePositiveWeight(JsonNode weightNode) {
        if (isMissingWeightNode(weightNode)) {
            return null;
        }
        try {
            return parsePositiveWeight(weightNode);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private boolean isMissingLocation(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String lower = value.trim().toLowerCase(Locale.ROOT);
        return lower.equals("unknown")
                || lower.equals("unspecified")
                || lower.equals("not specified")
                || lower.equals("none")
                || lower.equals("n/a")
                || lower.equals("null");
    }

    private String buildMissingFieldsPrompt(List<String> missingFields) {
        if (missingFields.size() == 1) {
            return "To calculate your exact delivery fee estimate, please tell me your " + missingFields.get(0) + ".";
        }
        if (missingFields.size() == 2) {
            return "To calculate your exact delivery fee estimate, please tell me your "
                    + missingFields.get(0) + " and " + missingFields.get(1) + ".";
        }
        return "To calculate your exact delivery fee estimate, please provide the pickup location, destination location, and parcel weight in kg.";
    }

    private String buildContextualMissingFieldsPrompt(
            List<String> missingFields,
            String knownPickup,
            String knownDestination,
            BigDecimal knownWeight) {
        StringBuilder sb = new StringBuilder("To calculate the delivery fee estimate");
        if (knownPickup != null) {
            sb.append(" from ").append(knownPickup);
        }
        if (knownDestination != null) {
            sb.append(" to ").append(knownDestination);
        }
        if (knownWeight != null) {
            sb.append(" for a ")
                    .append(knownWeight.stripTrailingZeros().toPlainString())
                    .append(" kg parcel");
        }
        sb.append(", please tell me your ");
        if (missingFields.size() == 1) {
            sb.append(missingFields.get(0));
        } else if (missingFields.size() == 2) {
            sb.append(missingFields.get(0)).append(" and ").append(missingFields.get(1));
        } else {
            return buildMissingFieldsPrompt(missingFields);
        }
        sb.append(".");
        return sb.toString();
    }

    private Optional<ResolvedLocation> resolveLocation(String rawInput) {
        if (rawInput == null || rawInput.isBlank()) {
            return Optional.empty();
        }
        String normalized = normalizeLocationKey(rawInput);

        ResolvedLocation exact = LOCATION_DIRECTORY.get(normalized);
        if (exact != null) {
            return Optional.of(exact);
        }

        String postalCode = extractPostalCode(rawInput);
        if (postalCode != null) {
            ResolvedLocation byPostal = LOCATION_DIRECTORY.get(postalCode);
            if (byPostal != null) {
                return Optional.of(byPostal);
            }
        }

        // Longest-key-first token/phrase match handles full addresses (e.g. "120 Galle Road, Colombo 03")
        for (Map.Entry<String, ResolvedLocation> entry : ORDERED_LOCATION_ENTRIES) {
            String candidateKey = entry.getKey();
            if (candidateKey.length() <= 3 || candidateKey.chars().allMatch(Character::isDigit)) {
                continue;
            }
            if (containsWholePhrase(normalized, candidateKey)) {
                return Optional.of(entry.getValue());
            }
        }

        return Optional.empty();
    }

    private static String extractPostalCode(String rawInput) {
        if (rawInput == null) {
            return null;
        }
        Matcher matcher = POSTAL_CODE_PATTERN.matcher(rawInput.trim());
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String normalizeLocationKey(String raw) {
        return raw.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[,.;:/\\-]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static boolean containsWholePhrase(String haystack, String phrase) {
        int idx = haystack.indexOf(phrase);
        while (idx >= 0) {
            boolean leftBoundary = idx == 0 || !Character.isLetterOrDigit(haystack.charAt(idx - 1));
            int endIdx = idx + phrase.length();
            boolean rightBoundary = endIdx == haystack.length() || !Character.isLetterOrDigit(haystack.charAt(endIdx));
            if (leftBoundary && rightBoundary) {
                return true;
            }
            idx = haystack.indexOf(phrase, idx + 1);
        }
        return false;
    }

    private static Map<String, ResolvedLocation> buildLocationDirectory() {
        Map<String, ResolvedLocation> map = new LinkedHashMap<>();

        // Colombo & Western Province areas
        register(map, new ResolvedLocation("Colombo", "00100", 6.9271, 79.8612),
                "colombo", "colombo 01", "colombo 1", "fort", "00100", "cmb");
        register(map, new ResolvedLocation("Colombo 02 (Slave Island)", "00200", 6.9215, 79.8585),
                "colombo 02", "colombo 2", "slave island", "union place", "00200");
        register(map, new ResolvedLocation("Colombo 03 (Kollupitiya)", "00300", 6.9150, 79.8550),
                "colombo 03", "colombo 3", "kollupitiya", "galle road", "00300");
        register(map, new ResolvedLocation("Colombo 04 (Bambalapitiya)", "00400", 6.8935, 79.8558),
                "colombo 04", "colombo 4", "bambalapitiya", "00400");
        register(map, new ResolvedLocation("Colombo 05 (Narahenpita)", "00500", 6.8919, 79.8777),
                "colombo 05", "colombo 5", "narahenpita", "havelock", "00500");
        register(map, new ResolvedLocation("Wellawatta (Colombo 06)", "00600", 6.8741, 79.8606),
                "wellawatta", "wellawatte", "colombo 06", "colombo 6", "00600");
        register(map, new ResolvedLocation("Colombo 07 (Cinnamon Gardens)", "00700", 6.9117, 79.8646),
                "colombo 07", "colombo 7", "cinnamon gardens", "horton place", "00700");
        register(map, new ResolvedLocation("Colombo 08 (Borella)", "00800", 6.9147, 79.8778),
                "colombo 08", "colombo 8", "borella", "00800");
        register(map, new ResolvedLocation("Dehiwala", "10350", 6.8511, 79.8653),
                "dehiwala", "10350");
        register(map, new ResolvedLocation("Mount Lavinia", "10370", 6.8300, 79.8650),
                "mount lavinia", "mt lavinia", "10370");
        register(map, new ResolvedLocation("Ratmalana", "10390", 6.8213, 79.8806),
                "ratmalana", "rathmalana", "10390");
        register(map, new ResolvedLocation("Moratuwa", "10400", 6.7730, 79.8816),
                "moratuwa", "10400", "colombo south");
        register(map, new ResolvedLocation("Piliyandala", "10300", 6.8018, 79.9227),
                "piliyandala", "10300", "suwarapola", "10301", "polgasowita", "10320");
        register(map, new ResolvedLocation("Nugegoda", "10250", 6.8729, 79.8886),
                "nugegoda", "kohuwala", "10250");
        register(map, new ResolvedLocation("Maharagama", "10280", 6.8480, 79.9265),
                "maharagama", "10280");
        register(map, new ResolvedLocation("Kottawa", "10220", 6.8414, 79.9652),
                "kottawa", "10220", "10230");
        register(map, new ResolvedLocation("Kotte (Rajagiriya)", "10100", 6.9094, 79.8950),
                "kotte", "sri jayawardenepura kotte", "rajagiriya", "nawala", "battaramulla", "10100");
        register(map, new ResolvedLocation("Homagama", "10200", 6.8440, 80.0024),
                "homagama", "10200");
        register(map, new ResolvedLocation("Avissawella", "10700", 6.9543, 80.2046),
                "avissawella", "10700");
        register(map, new ResolvedLocation("Gampaha", "11000", 7.0840, 80.0098),
                "gampaha", "11000");
        register(map, new ResolvedLocation("Negombo", "11500", 7.2008, 79.8737),
                "negombo", "katunayake", "11500");
        register(map, new ResolvedLocation("Wattala", "11300", 6.9892, 79.8917),
                "wattala", "ja ela", "ja-ela", "11300");
        register(map, new ResolvedLocation("Kelaniya", "11600", 6.9553, 79.9220),
                "kelaniya", "peliyagoda", "11600");
        register(map, new ResolvedLocation("Kadawatha", "11850", 7.0019, 79.9522),
                "kadawatha", "kiribathgoda", "11850");
        register(map, new ResolvedLocation("Kalutara", "12000", 6.5854, 79.9607),
                "kalutara", "12000");
        register(map, new ResolvedLocation("Panadura", "12500", 6.7132, 79.9026),
                "panadura", "horana", "12500");

        // Central Province
        register(map, new ResolvedLocation("Kandy", "20000", 7.2906, 80.6337),
                "kandy", "20000", "kdy");
        register(map, new ResolvedLocation("Peradeniya", "20400", 7.2699, 80.5938),
                "peradeniya", "20400");
        register(map, new ResolvedLocation("Matale", "21000", 7.4675, 80.6234),
                "matale", "21000");
        register(map, new ResolvedLocation("Dambulla", "21100", 7.8742, 80.6511),
                "dambulla", "21100");
        register(map, new ResolvedLocation("Nuwara Eliya", "22200", 6.9497, 80.7891),
                "nuwara eliya", "22200");
        register(map, new ResolvedLocation("Hatton", "22000", 6.8916, 80.5955),
                "hatton", "22000");

        // Southern Province
        register(map, new ResolvedLocation("Galle", "80000", 6.0535, 80.2210),
                "galle", "80000");
        register(map, new ResolvedLocation("Matara", "81000", 5.9549, 80.5550),
                "matara", "weligama", "81000");
        register(map, new ResolvedLocation("Hambantota", "82000", 6.1429, 81.1212),
                "hambantota", "tangalle", "82000");

        // Northern Province
        register(map, new ResolvedLocation("Jaffna", "40000", 9.6615, 80.0255),
                "jaffna", "40000");
        register(map, new ResolvedLocation("Kilinochchi", "44000", 9.3803, 80.3770),
                "kilinochchi", "44000");
        register(map, new ResolvedLocation("Mannar", "41000", 8.9810, 79.9044),
                "mannar", "41000");
        register(map, new ResolvedLocation("Mullaitivu", "42000", 9.2671, 80.8142),
                "mullaitivu", "42000");
        register(map, new ResolvedLocation("Vavuniya", "43000", 8.7514, 80.4971),
                "vavuniya", "43000");

        // Eastern Province
        register(map, new ResolvedLocation("Batticaloa", "30000", 7.7310, 81.6747),
                "batticaloa", "30000");
        register(map, new ResolvedLocation("Trincomalee", "31000", 8.5874, 81.2152),
                "trincomalee", "31000");
        register(map, new ResolvedLocation("Ampara", "32000", 7.2975, 81.6820),
                "ampara", "kalmunai", "32000");

        // North Western & North Central Provinces
        register(map, new ResolvedLocation("Kurunegala", "60000", 7.4863, 80.3623),
                "kurunegala", "60000");
        register(map, new ResolvedLocation("Chilaw", "61000", 7.5758, 79.7953),
                "chilaw", "61000");
        register(map, new ResolvedLocation("Puttalam", "61300", 8.0408, 79.8394),
                "puttalam", "61300");
        register(map, new ResolvedLocation("Anuradhapura", "50000", 8.3114, 80.4037),
                "anuradhapura", "50000");
        register(map, new ResolvedLocation("Polonnaruwa", "51000", 7.9403, 81.0188),
                "polonnaruwa", "51000");

        // Uva & Sabaragamuwa Provinces
        register(map, new ResolvedLocation("Badulla", "90000", 6.9934, 81.0550),
                "badulla", "90000");
        register(map, new ResolvedLocation("Bandarawela", "90100", 6.8259, 80.9982),
                "bandarawela", "90100");
        register(map, new ResolvedLocation("Ella", "90090", 6.8667, 81.0466),
                "ella", "90090");
        register(map, new ResolvedLocation("Monaragala", "91000", 6.8728, 81.3507),
                "monaragala", "moneragala", "91000");
        register(map, new ResolvedLocation("Ratnapura", "70000", 6.6828, 80.3992),
                "ratnapura", "70000");
        register(map, new ResolvedLocation("Kegalle", "71000", 7.2513, 80.3464),
                "kegalle", "71000", "yattogoda", "71029", "nelundeniya", "71060", "tuntota", "71062", "galigamuwa", "71350");
        register(map, new ResolvedLocation("Warakapola", "71600", 7.2275, 80.1972),
                "warakapola", "71600");

        return Map.copyOf(map);
    }

    private static void register(Map<String, ResolvedLocation> map, ResolvedLocation location, String... keys) {
        for (String key : keys) {
            map.put(key.toLowerCase(Locale.ROOT), location);
        }
    }
}

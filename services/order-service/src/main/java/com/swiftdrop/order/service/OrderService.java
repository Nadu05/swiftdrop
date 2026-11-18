package com.swiftdrop.order.service;

import com.swiftdrop.order.client.OrganizationServiceClient;
import com.swiftdrop.order.dto.*;
import com.swiftdrop.order.entity.*;
import com.swiftdrop.order.entity.enums.*;
import com.swiftdrop.order.exception.PaymentVerificationException;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.PricingQuoteRepository;
import com.swiftdrop.order.security.OrderUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@Transactional
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final DeliveryOrderRepository orderRepository;
    private final PricingQuoteRepository quoteRepository;
    private final OrganizationServiceClient organizationServiceClient;
    private final PricingEngineService pricingEngineService;
    private final TrackingNumberGenerator trackingNumberGenerator;
    private final AddressCoordinateResolver coordinateResolver;
    private final OrderLifecycleService lifecycleService;
    private final PaymentVerificationPort paymentVerificationPort;
    private final OrderEventPublisher eventPublisher;
    private final SecureRandom random = new SecureRandom();

    public OrderService(
            DeliveryOrderRepository orderRepository,
            PricingQuoteRepository quoteRepository,
            OrganizationServiceClient organizationServiceClient,
            PricingEngineService pricingEngineService,
            TrackingNumberGenerator trackingNumberGenerator,
            AddressCoordinateResolver coordinateResolver,
            OrderLifecycleService lifecycleService,
            PaymentVerificationPort paymentVerificationPort,
            OrderEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.quoteRepository = quoteRepository;
        this.organizationServiceClient = organizationServiceClient;
        this.pricingEngineService = pricingEngineService;
        this.trackingNumberGenerator = trackingNumberGenerator;
        this.coordinateResolver = coordinateResolver;
        this.lifecycleService = lifecycleService;
        this.paymentVerificationPort = paymentVerificationPort;
        this.eventPublisher = eventPublisher;
    }

    public OrderQuoteResponse generateQuote(OrderQuoteRequest request) {
        AddressCoordinateResolver.Coordinates pickupCoords = coordinateResolver.resolveCoordinates(
                request.getPickupLatitude(),
                request.getPickupLongitude(),
                request.getPickupAddress(),
                false
        );
        AddressCoordinateResolver.Coordinates destCoords = coordinateResolver.resolveCoordinates(
                request.getDestinationLatitude(),
                request.getDestinationLongitude(),
                request.getDropoffAddress(),
                true
        );

        RouteBranchResolutionDto routeResolution = organizationServiceClient.resolveRoute(
                request.getPickupPostalCode(),
                request.getDropoffPostalCode()
        );

        double effectiveDistanceKm = computeEffectiveRouteDistanceKm(
                pickupCoords,
                destCoords,
                routeResolution
        );

        ParcelSize parcelSize = ParcelSize.fromValue(request.getParcelSize());
        PricingEngineService.PricingCalculationResult pricing = pricingEngineService.calculatePrice(
                effectiveDistanceKm,
                request.getWeightKg(),
                parcelSize
        );

        PricingQuote quote = new PricingQuote();
        quote.setQuoteReference(generateQuoteReference());
        quote.setPickupAddress(request.getPickupAddress().trim());
        quote.setPickupLatitude(pickupCoords.latitude());
        quote.setPickupLongitude(pickupCoords.longitude());
        quote.setDropoffAddress(request.getDropoffAddress().trim());
        quote.setDestinationLatitude(destCoords.latitude());
        quote.setDestinationLongitude(destCoords.longitude());
        quote.setOriginBranchId(routeResolution.getOriginBranch().getBranchId());
        quote.setOriginBranchCode(routeResolution.getOriginBranch().getBranchCode());
        quote.setOriginBranchName(routeResolution.getOriginBranch().getBranchName());
        quote.setDestinationBranchId(routeResolution.getDestinationBranch().getBranchId());
        quote.setDestinationBranchCode(routeResolution.getDestinationBranch().getBranchCode());
        quote.setDestinationBranchName(routeResolution.getDestinationBranch().getBranchName());
        quote.setSameBranch(routeResolution.isSameBranch());
        quote.setParcelSize(parcelSize);
        quote.setWeightKg(request.getWeightKg().setScale(2, RoundingMode.HALF_UP));
        quote.setEstimatedDistanceKm(pricing.distanceKm());
        quote.setBaseFee(pricing.baseFee());
        quote.setDistanceFee(pricing.distanceFee());
        quote.setWeightFee(pricing.weightFee());
        quote.setSizeSurcharge(pricing.sizeSurcharge());
        quote.setEstimatedFee(pricing.totalFee());
        quote.setCurrency(pricing.currency());
        quote.setProvisionalPricing(pricing.provisional());
        quote.setCreatedAt(LocalDateTime.now());
        quote.setExpiresAt(LocalDateTime.now().plusMinutes(
                pricingEngineService.getPricingProperties().getQuoteValidityMinutes()
        ));

        PricingQuote savedQuote = quoteRepository.save(quote);

        OrderQuoteResponse response = new OrderQuoteResponse();
        response.setQuoteReference(savedQuote.getQuoteReference());
        response.setEstimatedFee(savedQuote.getEstimatedFee());
        response.setCurrency(savedQuote.getCurrency());
        response.setEstimatedDistanceKm(savedQuote.getEstimatedDistanceKm());
        response.setProvisionalPricing(savedQuote.isProvisionalPricing());
        response.setOriginBranch(routeResolution.getOriginBranch());
        response.setDestinationBranch(routeResolution.getDestinationBranch());
        response.setSameBranch(routeResolution.isSameBranch());
        response.setBreakdown(new OrderQuoteResponse.BreakdownDto(
                savedQuote.getBaseFee(),
                savedQuote.getDistanceFee(),
                savedQuote.getWeightFee(),
                savedQuote.getSizeSurcharge()
        ));
        response.setExpiresAt(savedQuote.getExpiresAt().toString());
        return response;
    }

    public DeliveryOrderResponse createOrder(CreateOrderRequest request, OrderUserPrincipal principal) {
        AddressCoordinateResolver.Coordinates pickupCoords = coordinateResolver.resolveCoordinates(
                request.getPickupLatitude(),
                request.getPickupLongitude(),
                request.getPickupAddress(),
                false
        );
        AddressCoordinateResolver.Coordinates destCoords = coordinateResolver.resolveCoordinates(
                request.getDestinationLatitude(),
                request.getDestinationLongitude(),
                request.getDropoffAddress(),
                true
        );

        RouteBranchResolutionDto routeResolution = organizationServiceClient.resolveRoute(
                request.getPickupPostalCode(),
                request.getDropoffPostalCode()
        );

        double effectiveDistanceKm = computeEffectiveRouteDistanceKm(
                pickupCoords,
                destCoords,
                routeResolution
        );

        ParcelSize parcelSize = ParcelSize.fromValue(request.getParcelSize());
        PricingEngineService.PricingCalculationResult pricing = pricingEngineService.calculatePrice(
                effectiveDistanceKm,
                request.getWeightKg(),
                parcelSize
        );

        PickupMethod pickupMethod = parsePickupMethod(request.getPickupMethod());
        PaymentMethod paymentMethod = parsePaymentMethod(request.getPaymentMethod());
        OrderSourceType orderSourceType = resolveOrderSourceType(request, principal);

        BigDecimal codAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (paymentMethod == PaymentMethod.COD && request.getCodAmount() != null) {
            codAmount = request.getCodAmount().setScale(2, RoundingMode.HALF_UP);
        }

        DeliveryOrder order = new DeliveryOrder();
        order.setTrackingNumber(trackingNumberGenerator.generateUniqueTrackingNumber());
        order.setOrderSourceType(orderSourceType);

        if (principal != null) {
            order.setCustomerUserId(principal.userId());
            order.setCustomerEmail(principal.email());
            if (orderSourceType == OrderSourceType.MERCHANT) {
                String principalOrg = principal.organizationId() != null && !principal.organizationId().isBlank()
                        ? principal.organizationId().trim()
                        : principal.userId();
                if (request.getMerchantOrganizationId() != null && !request.getMerchantOrganizationId().isBlank()) {
                    String requestedOrg = request.getMerchantOrganizationId().trim();
                    if (!principal.isGlobalAdmin()
                            && !requestedOrg.equalsIgnoreCase(principalOrg)
                            && !requestedOrg.equalsIgnoreCase(principal.userId())) {
                        throw new AccessDeniedException(
                                "Merchant cannot create orders on behalf of another organization"
                        );
                    }
                    order.setMerchantOrganizationId(requestedOrg);
                } else {
                    order.setMerchantOrganizationId(principalOrg);
                }
            } else if (request.getMerchantOrganizationId() != null && !request.getMerchantOrganizationId().isBlank()) {
                throw new AccessDeniedException(
                        "Only authenticated MERCHANT or ADMIN users may specify a merchantOrganizationId"
                );
            }
        } else if (request.getMerchantOrganizationId() != null && !request.getMerchantOrganizationId().isBlank()) {
            throw new AccessDeniedException("Authentication is required to create merchant orders");
        }

        order.setPickupMethod(pickupMethod);

        DeliveryAddress pickupDetails = new DeliveryAddress(
                request.getPickupAddress().trim(),
                request.getPickupCity() != null ? request.getPickupCity().trim() : extractCityHint(request.getPickupAddress()),
                request.getPickupPostalCode() != null ? request.getPickupPostalCode().trim() : null,
                pickupCoords.latitude(),
                pickupCoords.longitude(),
                request.getPickupContactName().trim(),
                request.getPickupContactPhone().trim(),
                request.getPickupContactEmail()
        );
        order.setPickupDetails(pickupDetails);

        DeliveryAddress dropoffDetails = new DeliveryAddress(
                request.getDropoffAddress().trim(),
                request.getDropoffCity() != null ? request.getDropoffCity().trim() : extractCityHint(request.getDropoffAddress()),
                request.getDropoffPostalCode() != null ? request.getDropoffPostalCode().trim() : null,
                destCoords.latitude(),
                destCoords.longitude(),
                request.getDropoffContactName().trim(),
                request.getDropoffContactPhone().trim(),
                request.getDropoffContactEmail()
        );
        order.setDropoffDetails(dropoffDetails);

        order.setOriginBranchId(routeResolution.getOriginBranch().getBranchId());
        order.setOriginBranchCode(routeResolution.getOriginBranch().getBranchCode());
        order.setOriginBranchName(routeResolution.getOriginBranch().getBranchName());
        order.setDestinationBranchId(routeResolution.getDestinationBranch().getBranchId());
        order.setDestinationBranchCode(routeResolution.getDestinationBranch().getBranchCode());
        order.setDestinationBranchName(routeResolution.getDestinationBranch().getBranchName());
        order.setSameBranch(routeResolution.isSameBranch());
        order.setDistanceKm(pricing.distanceKm());

        order.setQuoteReference(request.getQuoteReference());
        order.setBaseFee(pricing.baseFee());
        order.setDistanceFee(pricing.distanceFee());
        order.setWeightFee(pricing.weightFee());
        order.setSizeSurcharge(pricing.sizeSurcharge());
        order.setDeliveryFee(pricing.totalFee());
        order.setCurrency(pricing.currency());
        order.setPaymentMethod(paymentMethod);
        order.setCodAmount(codAmount);
        order.setDeliveryInstructions(request.getDeliveryInstructions());

        // Parcel attachment
        Parcel parcel = new Parcel();
        parcel.setDescription(request.getParcelDescription().trim());
        parcel.setParcelSize(parcelSize);
        parcel.setWeightKg(request.getWeightKg().setScale(2, RoundingMode.HALF_UP));
        parcel.setFragile(Boolean.TRUE.equals(request.getFragile()));
        parcel.setDeclaredValue(request.getDeclaredValue());
        order.attachParcel(parcel);

        // Payment & initial lifecycle status (Requirement 7, BD-01)
        PaymentReference paymentRef = new PaymentReference();
        paymentRef.setPaymentMethod(paymentMethod);
        paymentRef.setDeliveryFeeAmount(pricing.totalFee());
        paymentRef.setCodCollectionAmount(codAmount);
        paymentRef.setCurrency(pricing.currency());

        String actorId = principal != null ? principal.userId() : "guest";
        String actorRole = (principal != null && !principal.roles().isEmpty())
                ? principal.roles().get(0)
                : orderSourceType.name();

        if (paymentMethod == PaymentMethod.COD) {
            order.setPaymentStatus(PaymentStatus.COD_PENDING_COLLECTION);
            order.setStatus(OrderLifecycleStatus.CREATED);

            paymentRef.setPaymentStatus(PaymentStatus.COD_PENDING_COLLECTION);
            paymentRef.setGatewayProvider("CASH_ON_DELIVERY");
            paymentRef.setVerified(false);
            paymentRef.setNotes("COD order: delivery fee and COD amount to be collected upon delivery");
            order.addPaymentReference(paymentRef);

            TrackingEvent createdEvent = new TrackingEvent();
            createdEvent.setStatus(OrderLifecycleStatus.CREATED);
            createdEvent.setLocation(order.getOriginBranchName());
            createdEvent.setDescription("Delivery order created and assigned to " + order.getOriginBranchName());
            createdEvent.setActorId(actorId);
            createdEvent.setActorRole(actorRole);
            order.addTrackingEvent(createdEvent);

            // COD orders can immediately be CONFIRMED for dispatch
            lifecycleService.validateAndTransition(
                    order,
                    OrderLifecycleStatus.CONFIRMED,
                    null,
                    actorId,
                    actorRole
            );
        } else {
            // PREPAID: Never mark online payment as PAID without verified payment confirmation!
            if (request.getPaymentConfirmationToken() != null && !request.getPaymentConfirmationToken().isBlank()) {
                PaymentVerificationPort.VerificationResult verification =
                        paymentVerificationPort.verifyPrepaidTransaction(
                                request.getPaymentConfirmationToken(),
                                pricing.totalFee(),
                                pricing.currency()
                        );
                if (!verification.verified()) {
                    throw new PaymentVerificationException(verification.message());
                }
                order.setPaymentStatus(PaymentStatus.PAID);
                order.setStatus(OrderLifecycleStatus.CREATED);

                paymentRef.setPaymentStatus(PaymentStatus.PAID);
                paymentRef.setGatewayProvider(verification.gatewayProvider());
                paymentRef.setExternalTransactionRef(verification.externalTransactionRef());
                paymentRef.setVerified(true);
                paymentRef.setVerifiedAt(LocalDateTime.now());
                paymentRef.setNotes(verification.message());
                order.addPaymentReference(paymentRef);

                TrackingEvent createdEvent = new TrackingEvent();
                createdEvent.setStatus(OrderLifecycleStatus.CREATED);
                createdEvent.setLocation(order.getOriginBranchName());
                createdEvent.setDescription("Delivery order created and assigned to " + order.getOriginBranchName());
                createdEvent.setActorId(actorId);
                createdEvent.setActorRole(actorRole);
                order.addTrackingEvent(createdEvent);

                lifecycleService.validateAndTransition(
                        order,
                        OrderLifecycleStatus.CONFIRMED,
                        null,
                        actorId,
                        actorRole
                );
            } else {
                order.setPaymentStatus(PaymentStatus.PENDING_PAYMENT);
                order.setStatus(OrderLifecycleStatus.CREATED);

                paymentRef.setPaymentStatus(PaymentStatus.PENDING_PAYMENT);
                paymentRef.setGatewayProvider("PROVISIONAL_PAYMENT_GATEWAY");
                paymentRef.setVerified(false);
                paymentRef.setNotes("Awaiting verified prepaid transaction confirmation");
                order.addPaymentReference(paymentRef);

                TrackingEvent createdEvent = new TrackingEvent();
                createdEvent.setStatus(OrderLifecycleStatus.CREATED);
                createdEvent.setLocation(order.getOriginBranchName());
                createdEvent.setDescription("Delivery order created (awaiting prepaid payment confirmation)");
                createdEvent.setActorId(actorId);
                createdEvent.setActorRole(actorRole);
                order.addTrackingEvent(createdEvent);
            }
        }

        DeliveryOrder saved = orderRepository.save(order);
        eventPublisher.publishOrderCreated(saved);
        if (saved.getStatus() == OrderLifecycleStatus.CONFIRMED) {
            eventPublisher.publishOrderConfirmed(saved);
        }

        DeliveryOrderResponse response = toOrderResponse(saved);
        response.setMessage("Delivery order created successfully.");
        return response;
    }

    @Transactional(readOnly = true)
    public List<DeliveryOrderResponse> listOrders(OrderUserPrincipal principal, String statusFilter) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required to list delivery orders");
        }

        List<DeliveryOrder> orders;
        if (principal.isGlobalAdmin()) {
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                OrderLifecycleStatus targetStatus = OrderLifecycleStatus.fromValue(statusFilter);
                orders = orderRepository.findByStatusOrderByCreatedAtDesc(targetStatus);
            } else {
                orders = orderRepository.findAllByOrderByCreatedAtDesc();
            }
        } else if (principal.isBranchScopedStaff()) {
            if (principal.branchId() == null) {
                throw new AccessDeniedException("Branch-scoped staff must have an assigned branchId claim");
            }
            List<DeliveryOrder> branchOrders = orderRepository
                    .findByOriginBranchIdOrDestinationBranchIdOrderByCreatedAtDesc(principal.branchId(), principal.branchId());
            if (statusFilter != null && !statusFilter.isBlank() && !"ALL".equalsIgnoreCase(statusFilter)) {
                OrderLifecycleStatus targetStatus = OrderLifecycleStatus.fromValue(statusFilter);
                orders = branchOrders.stream().filter(o -> o.getStatus() == targetStatus).toList();
            } else {
                orders = branchOrders;
            }
        } else if (principal.hasRole("COURIER")) {
            orders = orderRepository.findByAssignedCourierIdOrderByCreatedAtDesc(principal.userId());
        } else if (principal.hasRole("MERCHANT")) {
            String orgId = principal.organizationId() != null ? principal.organizationId() : principal.userId();
            orders = orderRepository.findByMerchantOrganizationIdOrderByCreatedAtDesc(orgId);
        } else {
            orders = orderRepository.findByCustomerUserIdOrderByCreatedAtDesc(principal.userId());
            if (orders.isEmpty() && principal.email() != null) {
                orders = orderRepository.findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(principal.email());
            }
        }

        return orders.stream().map(this::toOrderResponse).toList();
    }

    @Transactional(readOnly = true)
    public DeliveryOrderResponse getOrderByIdOrTracking(String idOrTracking, OrderUserPrincipal principal) {
        DeliveryOrder order = resolveOrder(idOrTracking);
        enforceOrderReadAccess(order, principal);
        return toOrderResponse(order);
    }

    @Transactional(readOnly = true)
    public PublicTrackingResponse getPublicTracking(String trackingNumber) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            throw new IllegalArgumentException("Tracking number is required");
        }
        DeliveryOrder order = orderRepository.findByTrackingNumberIgnoreCase(trackingNumber.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Parcel not found with tracking number: " + trackingNumber.trim()
                ));

        PublicTrackingResponse resp = new PublicTrackingResponse();
        resp.setTrackingNumber(order.getTrackingNumber());
        resp.setStatus(order.getStatus().name());
        resp.setStatusLabel(order.getStatus().getDisplayLabel());
        resp.setOrigin(order.getPickupDetails().getCity() != null
                ? order.getPickupDetails().getCity()
                : order.getOriginBranchName());
        resp.setDestination(order.getDropoffDetails().getCity() != null
                ? order.getDropoffDetails().getCity()
                : order.getDestinationBranchName());
        resp.setParcelCategory(order.getParcel() != null
                ? order.getParcel().getParcelSize().getLabel()
                : "Standard Parcel");
        resp.setBranch(order.getOriginBranchName());
        resp.setDestinationBranch(order.getDestinationBranchName());
        resp.setDistanceKm(order.getDistanceKm());
        resp.setEstimatedDelivery(order.getStatus() == OrderLifecycleStatus.DELIVERED
                ? "Delivered"
                : "Within 24 hours");
        resp.setUpdatedAt(order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null);

        List<PublicTrackingResponse.PublicTrackingEventDto> safeEvents = order.getTrackingEvents().stream()
                .map(ev -> new PublicTrackingResponse.PublicTrackingEventDto(
                        ev.getStatus().name(),
                        ev.getStatus().getDisplayLabel(),
                        ev.getRecordedAt() != null ? ev.getRecordedAt().toString() : null,
                        sanitizePublicLocation(ev, order),
                        sanitizePublicDescription(ev, order)
                ))
                .toList();
        resp.setEvents(safeEvents);

        return resp;
    }

    private String sanitizePublicLocation(TrackingEvent ev, DeliveryOrder order) {
        String loc = ev.getLocation();
        if (loc == null || loc.isBlank()) {
            return order.getOriginBranchName();
        }
        String pickupAddr = order.getPickupDetails() != null ? order.getPickupDetails().getAddress() : null;
        String dropoffAddr = order.getDropoffDetails() != null ? order.getDropoffDetails().getAddress() : null;
        if (pickupAddr != null && !pickupAddr.isBlank() && loc.equalsIgnoreCase(pickupAddr.trim())) {
            return order.getPickupDetails().getCity() != null
                    ? order.getPickupDetails().getCity()
                    : order.getOriginBranchName();
        }
        if (dropoffAddr != null && !dropoffAddr.isBlank() && loc.equalsIgnoreCase(dropoffAddr.trim())) {
            return order.getDropoffDetails().getCity() != null
                    ? order.getDropoffDetails().getCity()
                    : order.getDestinationBranchName();
        }
        return loc;
    }

    private String sanitizePublicDescription(TrackingEvent ev, DeliveryOrder order) {
        String desc = ev.getDescription();
        if (desc == null || desc.isBlank()) {
            return ev.getStatus().getDisplayLabel();
        }
        String sanitized = desc;
        if (order.getPickupDetails() != null) {
            if (order.getPickupDetails().getAddress() != null && !order.getPickupDetails().getAddress().isBlank()) {
                sanitized = sanitized.replace(order.getPickupDetails().getAddress(),
                        order.getPickupDetails().getCity() != null ? order.getPickupDetails().getCity() : "origin area");
            }
            if (order.getPickupDetails().getContactName() != null && !order.getPickupDetails().getContactName().isBlank()) {
                sanitized = sanitized.replace(order.getPickupDetails().getContactName(), "sender");
            }
        }
        if (order.getDropoffDetails() != null) {
            if (order.getDropoffDetails().getAddress() != null && !order.getDropoffDetails().getAddress().isBlank()) {
                sanitized = sanitized.replace(order.getDropoffDetails().getAddress(),
                        order.getDropoffDetails().getCity() != null ? order.getDropoffDetails().getCity() : "destination area");
            }
            if (order.getDropoffDetails().getContactName() != null && !order.getDropoffDetails().getContactName().isBlank()) {
                sanitized = sanitized.replace(order.getDropoffDetails().getContactName(), "recipient");
            }
        }
        sanitized = sanitized.replaceAll("(?i)\\(Recipient:\\s*[^)]+\\)", "(Verified POD)");
        return sanitized;
    }

    public DeliveryOrderResponse updateOrderStatus(
            String idOrTracking,
            OrderStatusUpdateRequest request,
            OrderUserPrincipal principal) {

        if (principal == null
                || (!principal.isGlobalAdmin()
                && !principal.isBranchScopedStaff()
                && !principal.hasRole("COURIER"))) {
            throw new AccessDeniedException(
                    "Only ADMIN, BRANCH_MANAGER, BRANCH_STAFF, DISPATCHER, or assigned COURIER roles may transition operational parcel statuses"
            );
        }

        DeliveryOrder order = resolveOrder(idOrTracking);
        if (principal.isGlobalAdmin()) {
            // Global admin or internal S2S allowed
        } else if (principal.isBranchScopedStaff()) {
            if (!principal.canAccessOrderBranch(order.getOriginBranchId(), order.getDestinationBranchId())) {
                throw new AccessDeniedException(
                        "Staff member is not authorized to update orders outside their assigned branch"
                );
            }
        } else if (principal.hasRole("COURIER")) {
            if (order.getAssignedCourierId() == null || !order.getAssignedCourierId().equals(principal.userId())) {
                throw new AccessDeniedException(
                        "Courier may only update operational status for orders assigned to them"
                );
            }
        }

        String previousStatus = order.getStatus().name();
        OrderLifecycleStatus targetStatus = OrderLifecycleStatus.fromValue(request.getStatus());

        String actorRole = principal.roles().isEmpty() ? "SYSTEM" : principal.roles().get(0);
        lifecycleService.validateAndTransition(order, targetStatus, request, principal.userId(), actorRole);

        DeliveryOrder saved = orderRepository.save(order);
        eventPublisher.publishOrderStatusChanged(saved, previousStatus);
        return toOrderResponse(saved);
    }

    public DeliveryOrderResponse recordBranchDropoff(
            String idOrTracking,
            String notes,
            OrderUserPrincipal principal) {

        if (principal == null || (!principal.isGlobalAdmin() && !principal.isBranchScopedStaff())) {
            throw new AccessDeniedException(
                    "Only authorized branch staff, dispatchers, or administrators may record branch drop-off intake"
            );
        }

        DeliveryOrder order = resolveOrder(idOrTracking);
        if (principal.isBranchScopedStaff() && !principal.canManageOriginBranch(order.getOriginBranchId())) {
            throw new AccessDeniedException(
                    "Branch staff can only record parcel drop-off intake at their assigned origin branch"
            );
        }

        if (order.getPickupMethod() != PickupMethod.BRANCH_DROPOFF) {
            order.setPickupMethod(PickupMethod.BRANCH_DROPOFF);
        }

        String previousStatus = order.getStatus().name();
        OrderStatusUpdateRequest req = new OrderStatusUpdateRequest();
        req.setStatus(OrderLifecycleStatus.AT_ORIGIN_BRANCH.name());
        req.setLocation(order.getOriginBranchName());
        req.setDescription(notes != null && !notes.isBlank()
                ? notes.trim()
                : "Parcel dropped off directly at origin branch (" + order.getOriginBranchName() + ")");

        String actorId = principal.userId();
        String actorRole = !principal.roles().isEmpty() ? principal.roles().get(0) : "BRANCH_STAFF";

        lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                req,
                actorId,
                actorRole
        );

        DeliveryOrder saved = orderRepository.save(order);
        eventPublisher.publishOrderStatusChanged(saved, previousStatus);
        return toOrderResponse(saved);
    }

    public DeliveryOrderResponse confirmPrepaidPayment(
            String idOrTracking,
            PaymentConfirmationRequest request,
            OrderUserPrincipal principal) {

        DeliveryOrder order = resolveOrder(idOrTracking);
        enforceOrderReadAccess(order, principal);

        if (order.getPaymentMethod() != PaymentMethod.PREPAID) {
            throw new IllegalArgumentException("Order " + order.getTrackingNumber() + " is not a PREPAID order");
        }

        PaymentVerificationPort.VerificationResult verification =
                paymentVerificationPort.verifyPrepaidTransaction(
                        request.getExternalTransactionRef(),
                        order.getDeliveryFee(),
                        order.getCurrency()
                );

        if (!verification.verified()) {
            throw new PaymentVerificationException(verification.message());
        }

        order.setPaymentStatus(PaymentStatus.PAID);

        PaymentReference ref = new PaymentReference();
        ref.setPaymentMethod(PaymentMethod.PREPAID);
        ref.setPaymentStatus(PaymentStatus.PAID);
        ref.setDeliveryFeeAmount(order.getDeliveryFee());
        ref.setCodCollectionAmount(order.getCodAmount());
        ref.setCurrency(order.getCurrency());
        ref.setGatewayProvider(verification.gatewayProvider());
        ref.setExternalTransactionRef(verification.externalTransactionRef());
        ref.setVerified(true);
        ref.setVerifiedAt(LocalDateTime.now());
        ref.setNotes(request.getNotes() != null ? request.getNotes() : verification.message());
        order.addPaymentReference(ref);

        if (order.getStatus() == OrderLifecycleStatus.CREATED) {
            String previousStatus = order.getStatus().name();
            String actorId = principal != null ? principal.userId() : "system";
            String actorRole = (principal != null && !principal.roles().isEmpty()) ? principal.roles().get(0) : "CUSTOMER";
            lifecycleService.validateAndTransition(
                    order,
                    OrderLifecycleStatus.CONFIRMED,
                    null,
                    actorId,
                    actorRole
            );
            DeliveryOrder saved = orderRepository.save(order);
            eventPublisher.publishOrderConfirmed(saved);
            eventPublisher.publishOrderStatusChanged(saved, previousStatus);
            return toOrderResponse(saved);
        }

        DeliveryOrder saved = orderRepository.save(order);
        return toOrderResponse(saved);
    }

    public DeliveryOrderResponse cancelOrder(
            String idOrTracking,
            OrderCancelRequest request,
            OrderUserPrincipal principal) {

        if (principal == null) {
            throw new AccessDeniedException("Authentication is required to cancel an order");
        }
        if (principal.hasRole("COURIER") && !principal.isGlobalAdmin() && !principal.isBranchScopedStaff()) {
            throw new AccessDeniedException("Couriers are not permitted to cancel delivery orders");
        }

        DeliveryOrder order = resolveOrder(idOrTracking);
        enforceOrderReadAccess(order, principal);

        String previousStatus = order.getStatus().name();
        String reason = request != null && request.getReason() != null
                ? request.getReason().trim()
                : "Cancelled by requester";

        OrderStatusUpdateRequest statusReq = new OrderStatusUpdateRequest();
        statusReq.setStatus(OrderLifecycleStatus.CANCELLED.name());
        statusReq.setDescription("Order cancelled: " + reason);

        String actorId = principal != null ? principal.userId() : "system";
        String actorRole = (principal != null && !principal.roles().isEmpty()) ? principal.roles().get(0) : "CUSTOMER";

        lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.CANCELLED,
                statusReq,
                actorId,
                actorRole
        );
        order.setCancellationReason(reason);

        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.REFUNDED);
        }

        DeliveryOrder saved = orderRepository.save(order);
        eventPublisher.publishOrderStatusChanged(saved, previousStatus);
        return toOrderResponse(saved);
    }

    private void enforceOrderReadAccess(DeliveryOrder order, OrderUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("Authentication is required to access order details");
        }
        if (principal.isGlobalAdmin()) {
            return;
        }
        if (principal.isBranchScopedStaff()) {
            if (principal.canAccessOrderBranch(order.getOriginBranchId(), order.getDestinationBranchId())) {
                return;
            }
            throw new AccessDeniedException(
                    "Staff member is not authorized to access orders outside their assigned branch"
            );
        }
        if (principal.hasRole("COURIER")) {
            if (order.getAssignedCourierId() != null && order.getAssignedCourierId().equals(principal.userId())) {
                return;
            }
            throw new AccessDeniedException("Courier may only access orders assigned to them");
        }
        if (principal.hasRole("MERCHANT")) {
            String merchantOrg = order.getMerchantOrganizationId();
            if (merchantOrg != null
                    && (merchantOrg.equalsIgnoreCase(principal.organizationId())
                    || merchantOrg.equalsIgnoreCase(principal.userId()))) {
                return;
            }
            if (order.getCustomerUserId() != null && order.getCustomerUserId().equals(principal.userId())) {
                return;
            }
            throw new AccessDeniedException("Merchant can only access orders associated with their organization");
        }

        // Default CUSTOMER role check
        boolean matchesUserId = order.getCustomerUserId() != null
                && order.getCustomerUserId().equals(principal.userId());
        boolean matchesEmail = order.getCustomerEmail() != null
                && principal.email() != null
                && order.getCustomerEmail().equalsIgnoreCase(principal.email());

        if (!matchesUserId && !matchesEmail) {
            throw new AccessDeniedException("You are not authorized to access another customer's order");
        }
    }

    private DeliveryOrder resolveOrder(String idOrTracking) {
        if (idOrTracking == null || idOrTracking.isBlank()) {
            throw new ResourceNotFoundException("Order identifier is required");
        }
        String trimmed = idOrTracking.trim();
        Optional<DeliveryOrder> byTracking = orderRepository.findByTrackingNumberIgnoreCase(trimmed);
        if (byTracking.isPresent()) {
            return byTracking.get();
        }
        try {
            Long numericId = Long.parseLong(trimmed);
            return orderRepository.findById(numericId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order", numericId));
        } catch (NumberFormatException ex) {
            throw new ResourceNotFoundException("Order not found with identifier: " + trimmed);
        }
    }

    private double computeEffectiveRouteDistanceKm(
            AddressCoordinateResolver.Coordinates pickupCoords,
            AddressCoordinateResolver.Coordinates destCoords,
            RouteBranchResolutionDto routeResolution) {

        double directDistanceKm = coordinateResolver.calculateDistanceKm(
                pickupCoords.latitude(),
                pickupCoords.longitude(),
                destCoords.latitude(),
                destCoords.longitude()
        );

        double pickupToOrigin = routeResolution.getOriginBranch().getDistanceKm() != null
                ? routeResolution.getOriginBranch().getDistanceKm()
                : 0.0;
        double interBranch = routeResolution.getInterBranchDistanceKm() != null
                ? routeResolution.getInterBranchDistanceKm()
                : 0.0;
        double destToBranch = routeResolution.getDestinationBranch().getDistanceKm() != null
                ? routeResolution.getDestinationBranch().getDistanceKm()
                : 0.0;

        double hubRouteDistance = pickupToOrigin + interBranch + destToBranch;
        return Math.max(directDistanceKm, Math.max(0.5, hubRouteDistance));
    }

    private PickupMethod parsePickupMethod(String raw) {
        if (raw == null || raw.isBlank()) {
            return PickupMethod.COURIER_PICKUP;
        }
        try {
            return PickupMethod.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid pickupMethod: '" + raw + "'. Allowed values: COURIER_PICKUP, BRANCH_DROPOFF"
            );
        }
    }

    private PaymentMethod parsePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) {
            return PaymentMethod.PREPAID;
        }
        try {
            return PaymentMethod.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid paymentMethod: '" + raw + "'. Allowed values: PREPAID, COD"
            );
        }
    }

    private OrderSourceType resolveOrderSourceType(CreateOrderRequest request, OrderUserPrincipal principal) {
        if (principal != null && principal.hasRole("MERCHANT")) {
            return OrderSourceType.MERCHANT;
        }
        if (request.getOrderSourceType() != null && !request.getOrderSourceType().isBlank()) {
            OrderSourceType requested;
            try {
                requested = OrderSourceType.valueOf(request.getOrderSourceType().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException(
                        "Invalid orderSourceType: '" + request.getOrderSourceType() + "'. Allowed values: CUSTOMER, MERCHANT"
                );
            }
            if (requested == OrderSourceType.MERCHANT
                    && (principal == null || (!principal.hasRole("MERCHANT") && !principal.isGlobalAdmin()))) {
                throw new AccessDeniedException(
                        "Only authenticated MERCHANT or ADMIN users may create merchant orders"
                );
            }
            return requested;
        }
        return OrderSourceType.CUSTOMER;
    }

    private String extractCityHint(String address) {
        if (address == null || address.isBlank()) {
            return "Colombo";
        }
        String[] parts = address.split(",");
        return parts[parts.length - 1].trim();
    }

    private String generateQuoteReference() {
        int year = Year.now().getValue();
        int num = 10000 + random.nextInt(90000);
        return String.format("QT-%d-%05d", year, num);
    }

    private DeliveryOrderResponse toOrderResponse(DeliveryOrder order) {
        DeliveryOrderResponse dto = new DeliveryOrderResponse();
        dto.setId(order.getId());
        dto.setTrackingNumber(order.getTrackingNumber());
        dto.setStatus(order.getStatus().name());
        dto.setStatusLabel(order.getStatus().getDisplayLabel());
        dto.setOrderSourceType(order.getOrderSourceType().name());
        dto.setCustomerUserId(order.getCustomerUserId());
        dto.setCustomerEmail(order.getCustomerEmail());
        dto.setMerchantOrganizationId(order.getMerchantOrganizationId());
        dto.setPickupMethod(order.getPickupMethod().name());

        if (order.getPickupDetails() != null) {
            dto.setPickupAddress(order.getPickupDetails().getAddress());
            dto.setPickupCity(order.getPickupDetails().getCity());
            dto.setPickupPostalCode(order.getPickupDetails().getPostalCode());
            dto.setPickupLatitude(order.getPickupDetails().getLatitude());
            dto.setPickupLongitude(order.getPickupDetails().getLongitude());
            dto.setPickupContactName(order.getPickupDetails().getContactName());
            dto.setPickupContactPhone(order.getPickupDetails().getContactPhone());
            dto.setPickupContactEmail(order.getPickupDetails().getContactEmail());
        }

        if (order.getDropoffDetails() != null) {
            dto.setDropoffAddress(order.getDropoffDetails().getAddress());
            dto.setDropoffCity(order.getDropoffDetails().getCity());
            dto.setDropoffPostalCode(order.getDropoffDetails().getPostalCode());
            dto.setDestinationLatitude(order.getDropoffDetails().getLatitude());
            dto.setDestinationLongitude(order.getDropoffDetails().getLongitude());
            dto.setDropoffContactName(order.getDropoffDetails().getContactName());
            dto.setDropoffContactPhone(order.getDropoffDetails().getContactPhone());
            dto.setDropoffContactEmail(order.getDropoffDetails().getContactEmail());
        }

        if (order.getParcel() != null) {
            dto.setParcelDescription(order.getParcel().getDescription());
            dto.setParcelSize(order.getParcel().getParcelSize().name());
            dto.setWeightKg(order.getParcel().getWeightKg());
            dto.setFragile(order.getParcel().isFragile());
            dto.setDeclaredValue(order.getParcel().getDeclaredValue());
        }

        dto.setDeliveryInstructions(order.getDeliveryInstructions());
        dto.setOriginBranchId(order.getOriginBranchId());
        dto.setOriginBranchCode(order.getOriginBranchCode());
        dto.setOriginBranchName(order.getOriginBranchName());
        dto.setDestinationBranchId(order.getDestinationBranchId());
        dto.setDestinationBranchCode(order.getDestinationBranchCode());
        dto.setDestinationBranchName(order.getDestinationBranchName());
        dto.setBranch(order.getOriginBranchName());
        dto.setSameBranch(order.isSameBranch());
        dto.setDistanceKm(order.getDistanceKm());

        dto.setQuoteReference(order.getQuoteReference());
        dto.setBaseFee(order.getBaseFee());
        dto.setDistanceFee(order.getDistanceFee());
        dto.setWeightFee(order.getWeightFee());
        dto.setSizeSurcharge(order.getSizeSurcharge());
        dto.setDeliveryFee(order.getDeliveryFee());
        dto.setCurrency(order.getCurrency());
        dto.setPaymentMethod(order.getPaymentMethod().name());
        dto.setPaymentStatus(order.getPaymentStatus().name());
        dto.setCodAmount(order.getCodAmount());

        dto.setFailedAttemptCount(order.getFailedAttemptCount());
        dto.setCancellationReason(order.getCancellationReason());
        dto.setCourierId(order.getAssignedCourierId());
        dto.setCourierName(order.getAssignedCourierName());
        dto.setCourierPhone(order.getAssignedCourierPhone());
        dto.setCourierVehicle(order.getAssignedCourierVehicle());
        dto.setRecipientConfirmedName(order.getRecipientConfirmedName());
        dto.setSignatureReference(order.getSignatureReference());
        dto.setPhotoEvidenceUrl(order.getPhotoEvidenceUrl());
        dto.setDeliveredAt(order.getDeliveredAt() != null ? order.getDeliveredAt().toString() : null);

        dto.setCreatedAt(order.getCreatedAt() != null ? order.getCreatedAt().toString() : null);
        dto.setUpdatedAt(order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null);

        if (order.getTrackingEvents() != null) {
            dto.setTrackingEvents(order.getTrackingEvents().stream()
                    .map(ev -> new DeliveryOrderResponse.TrackingEventDto(
                            ev.getId(),
                            ev.getStatus().name(),
                            ev.getStatus().getDisplayLabel(),
                            ev.getLocation(),
                            ev.getDescription(),
                            ev.getActorRole(),
                            ev.getRecordedAt() != null ? ev.getRecordedAt().toString() : null
                    ))
                    .toList());
        }

        if (order.getPaymentReferences() != null) {
            dto.setPaymentReferences(order.getPaymentReferences().stream()
                    .map(pr -> {
                        DeliveryOrderResponse.PaymentReferenceDto pDto = new DeliveryOrderResponse.PaymentReferenceDto();
                        pDto.setId(pr.getId());
                        pDto.setPaymentMethod(pr.getPaymentMethod().name());
                        pDto.setPaymentStatus(pr.getPaymentStatus().name());
                        pDto.setDeliveryFeeAmount(pr.getDeliveryFeeAmount());
                        pDto.setCodCollectionAmount(pr.getCodCollectionAmount());
                        pDto.setCurrency(pr.getCurrency());
                        pDto.setGatewayProvider(pr.getGatewayProvider());
                        pDto.setExternalTransactionRef(pr.getExternalTransactionRef());
                        pDto.setVerified(pr.isVerified());
                        pDto.setVerifiedAt(pr.getVerifiedAt() != null ? pr.getVerifiedAt().toString() : null);
                        pDto.setCreatedAt(pr.getCreatedAt() != null ? pr.getCreatedAt().toString() : null);
                        return pDto;
                    })
                    .toList());
        }

        return dto;
    }
}


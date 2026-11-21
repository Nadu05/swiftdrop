package com.swiftdrop.order.service;

import com.swiftdrop.order.client.OrganizationServiceClient;
import com.swiftdrop.order.config.PricingProperties;
import com.swiftdrop.order.dto.*;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.PricingQuote;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.PricingQuoteRepository;
import com.swiftdrop.order.security.OrderUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private DeliveryOrderRepository orderRepository;

    @Mock
    private PricingQuoteRepository quoteRepository;

    @Mock
    private OrganizationServiceClient organizationServiceClient;

    @Mock
    private TrackingNumberGenerator trackingNumberGenerator;

    @Mock
    private OrderEventPublisher eventPublisher;

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        PricingProperties pricingProperties = new PricingProperties();
        PricingEngineService pricingEngineService = new PricingEngineService(pricingProperties);
        AddressCoordinateResolver coordinateResolver = new AddressCoordinateResolver();
        OrderLifecycleService lifecycleService = new OrderLifecycleService();
        PaymentVerificationPort paymentVerificationPort = new ProvisionalPaymentVerificationService();

        orderService = new OrderService(
                orderRepository,
                quoteRepository,
                organizationServiceClient,
                pricingEngineService,
                trackingNumberGenerator,
                coordinateResolver,
                lifecycleService,
                paymentVerificationPort,
                eventPublisher
        );
    }

    private RouteBranchResolutionDto mockRouteResolution() {
        BranchResolutionInfoDto origin = new BranchResolutionInfoDto(
                1L, "CMB-CENTRAL", "Colombo Central Hub", 1.2, true
        );
        BranchResolutionInfoDto dest = new BranchResolutionInfoDto(
                2L, "KDY-MAIN", "Kandy Regional Hub", 2.0, true
        );
        RouteBranchResolutionDto dto = new RouteBranchResolutionDto();
        dto.setOriginBranch(origin);
        dto.setDestinationBranch(dest);
        dto.setInterBranchDistanceKm(94.8);
        dto.setSameBranch(false);
        return dto;
    }

    @Test
    void generateQuote_ResolvesBothBranchesAndReturnsProvisionalBreakdown() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenReturn(mockRouteResolution());
        when(quoteRepository.save(any(PricingQuote.class))).thenAnswer(inv -> {
            PricingQuote q = inv.getArgument(0);
            q.setId(10L);
            return q;
        });

        OrderQuoteRequest request = new OrderQuoteRequest();
        request.setPickupAddress("120 Galle Road, Colombo 03");
        request.setPickupPostalCode("00300");
        request.setDropoffAddress("45 Peradeniya Road, Kandy");
        request.setDropoffPostalCode("20000");
        request.setParcelSize("MEDIUM");
        request.setWeightKg(new BigDecimal("3.0"));

        OrderQuoteResponse response = orderService.generateQuote(request);

        verify(organizationServiceClient).resolveRoute("00300", "20000");
        assertThat(response.getQuoteReference()).startsWith("QT-");
        assertThat(response.isProvisionalPricing()).isTrue();
        assertThat(response.getOriginBranch().getBranchCode()).isEqualTo("CMB-CENTRAL");
        assertThat(response.getDestinationBranch().getBranchCode()).isEqualTo("KDY-MAIN");
        assertThat(response.getEstimatedFee()).isGreaterThan(new BigDecimal("1000.00"));
        assertThat(response.getBreakdown().getSizeSurcharge()).isEqualByComparingTo("250.00");
    }

    @Test
    void createOrder_PrepaidWithoutVerifiedTransactionRef_RemainsPendingPaymentAndNeverFalselyMarkedPaid() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenReturn(mockRouteResolution());
        when(trackingNumberGenerator.generateUniqueTrackingNumber()).thenReturn("SD-91001");
        when(orderRepository.save(any(DeliveryOrder.class))).thenAnswer(inv -> {
            DeliveryOrder o = inv.getArgument(0);
            o.setId(101L);
            return o;
        });

        CreateOrderRequest request = new CreateOrderRequest();
        request.setPickupContactName("Kasun Silva");
        request.setPickupContactPhone("+94 77 111 2222");
        request.setPickupAddress("120 Galle Road, Colombo 03");
        request.setPickupPostalCode("00300");
        request.setDropoffContactName("Nimal Perera");
        request.setDropoffContactPhone("+94 77 333 4444");
        request.setDropoffAddress("45 Peradeniya Road, Kandy");
        request.setDropoffPostalCode("20000");
        request.setParcelDescription("Standard parcel");
        request.setParcelSize("SMALL");
        request.setWeightKg(new BigDecimal("1.0"));
        request.setPaymentMethod("PREPAID");
        request.setPickupMethod("COURIER_PICKUP");

        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        DeliveryOrderResponse response = orderService.createOrder(request, customer);

        verify(organizationServiceClient).resolveRoute("00300", "20000");
        assertThat(response.getTrackingNumber()).isEqualTo("SD-91001");
        assertThat(response.getOriginBranchId()).isEqualTo(1L);
        assertThat(response.getOriginBranchCode()).isEqualTo("CMB-CENTRAL");
        assertThat(response.getOriginBranchName()).isEqualTo("Colombo Central Hub");
        assertThat(response.getDestinationBranchId()).isEqualTo(2L);
        assertThat(response.getDestinationBranchCode()).isEqualTo("KDY-MAIN");
        assertThat(response.getDestinationBranchName()).isEqualTo("Kandy Regional Hub");
        assertThat(response.getPaymentMethod()).isEqualTo("PREPAID");
        assertThat(response.getPaymentStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(response.getStatus()).isEqualTo("CREATED");
        assertThat(response.getPaymentReferences()).hasSize(1);
        assertThat(response.getPaymentReferences().get(0).isVerified()).isFalse();
    }

    @Test
    void createOrder_MerchantCodWithBranchDropoff_SeparatesCodAmountFromDeliveryFeeAndAssociatesMerchantOrg() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenReturn(mockRouteResolution());
        when(trackingNumberGenerator.generateUniqueTrackingNumber()).thenReturn("SD-91002");
        when(orderRepository.save(any(DeliveryOrder.class))).thenAnswer(inv -> {
            DeliveryOrder o = inv.getArgument(0);
            o.setId(102L);
            return o;
        });

        CreateOrderRequest request = new CreateOrderRequest();
        request.setPickupContactName("Apex Retail Store");
        request.setPickupContactPhone("+94 11 234 5678");
        request.setPickupAddress("50 Duplication Road, Colombo 04");
        request.setPickupPostalCode("00400");
        request.setDropoffContactName("Amali Fernando");
        request.setDropoffContactPhone("+94 71 987 6543");
        request.setDropoffAddress("18 Dalada Veediya, Kandy");
        request.setDropoffPostalCode("20000");
        request.setParcelDescription("Retail order #9002");
        request.setParcelSize("LARGE");
        request.setWeightKg(new BigDecimal("4.0"));
        request.setPaymentMethod("COD");
        request.setCodAmount(new BigDecimal("18500.00"));
        request.setPickupMethod("BRANCH_DROPOFF");

        OrderUserPrincipal merchant = new OrderUserPrincipal(
                "merch-user-1", "ops@apexretail.lk", "org-apex-77", List.of("MERCHANT")
        );

        DeliveryOrderResponse response = orderService.createOrder(request, merchant);

        assertThat(response.getOrderSourceType()).isEqualTo("MERCHANT");
        assertThat(response.getMerchantOrganizationId()).isEqualTo("org-apex-77");
        assertThat(response.getPickupMethod()).isEqualTo("BRANCH_DROPOFF");
        assertThat(response.getPaymentMethod()).isEqualTo("COD");
        assertThat(response.getPaymentStatus()).isEqualTo("COD_PENDING_COLLECTION");
        assertThat(response.getStatus()).isEqualTo("CONFIRMED");
        assertThat(response.getCodAmount()).isEqualByComparingTo("18500.00");
        assertThat(response.getDeliveryFee()).isNotEqualByComparingTo(response.getCodAmount());
    }

    @Test
    void getOrderByIdOrTracking_EnforcesCustomerAndMerchantOwnershipBoundaries() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenReturn(mockRouteResolution());
        when(trackingNumberGenerator.generateUniqueTrackingNumber()).thenReturn("SD-91003");

        final DeliveryOrder[] capturedOrder = new DeliveryOrder[1];
        when(orderRepository.save(any(DeliveryOrder.class))).thenAnswer(inv -> {
            DeliveryOrder o = inv.getArgument(0);
            o.setId(103L);
            capturedOrder[0] = o;
            return o;
        });

        CreateOrderRequest request = new CreateOrderRequest();
        request.setPickupContactName("Kasun Silva");
        request.setPickupContactPhone("+94 77 111 2222");
        request.setPickupAddress("120 Galle Road, Colombo 03");
        request.setPickupPostalCode("00300");
        request.setDropoffContactName("Nimal Perera");
        request.setDropoffContactPhone("+94 77 333 4444");
        request.setDropoffAddress("45 Peradeniya Road, Kandy");
        request.setDropoffPostalCode("20000");
        request.setParcelDescription("Books");
        request.setParcelSize("SMALL");
        request.setWeightKg(new BigDecimal("1.0"));
        request.setPaymentMethod("COD");
        request.setCodAmount(new BigDecimal("2500.00"));

        OrderUserPrincipal ownerCustomer = new OrderUserPrincipal(
                "cust-owner", "owner@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        orderService.createOrder(request, ownerCustomer);

        when(orderRepository.findByTrackingNumberIgnoreCase("SD-91003"))
                .thenReturn(Optional.of(capturedOrder[0]));

        // Owner can access
        DeliveryOrderResponse ownerView = orderService.getOrderByIdOrTracking("SD-91003", ownerCustomer);
        assertThat(ownerView.getTrackingNumber()).isEqualTo("SD-91003");

        // Another customer is denied
        OrderUserPrincipal otherCustomer = new OrderUserPrincipal(
                "cust-other", "other@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        assertThatThrownBy(() -> orderService.getOrderByIdOrTracking("SD-91003", otherCustomer))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You are not authorized to access another customer's order");

        // Dispatcher assigned to origin branch (1L) can access operational orders
        OrderUserPrincipal dispatcher = new OrderUserPrincipal(
                "disp-1", "dispatcher@swiftdrop.lk", null, List.of("DISPATCHER"), 1L
        );
        DeliveryOrderResponse dispatcherView = orderService.getOrderByIdOrTracking("SD-91003", dispatcher);
        assertThat(dispatcherView.getTrackingNumber()).isEqualTo("SD-91003");

        // Dispatcher with null branchId fails closed
        OrderUserPrincipal unscopedDispatcher = new OrderUserPrincipal(
                "disp-null", "dispnull@swiftdrop.lk", null, List.of("DISPATCHER"), null
        );
        assertThatThrownBy(() -> orderService.getOrderByIdOrTracking("SD-91003", unscopedDispatcher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("outside their assigned branch");

        // Dispatcher for unrelated branch (99L) is denied
        OrderUserPrincipal otherBranchDispatcher = new OrderUserPrincipal(
                "disp-99", "disp99@swiftdrop.lk", null, List.of("DISPATCHER"), 99L
        );
        assertThatThrownBy(() -> orderService.getOrderByIdOrTracking("SD-91003", otherBranchDispatcher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("outside their assigned branch");

        // Customer cannot record branch drop-off intake
        assertThatThrownBy(() -> orderService.recordBranchDropoff("SD-91003", "Self dropoff", ownerCustomer))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only authorized branch staff");

        // Courier cannot cancel order
        OrderUserPrincipal courier = new OrderUserPrincipal(
                "courier-1", "courier1@swiftdrop.lk", null, List.of("COURIER"), 1L
        );
        assertThatThrownBy(() -> orderService.cancelOrder("SD-91003", new OrderCancelRequest("Courier cancel"), courier))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Couriers are not permitted to cancel");

        // Customer cannot spoof MERCHANT orderSourceType
        request.setOrderSourceType("MERCHANT");
        assertThatThrownBy(() -> orderService.createOrder(request, ownerCustomer))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Only authenticated MERCHANT or ADMIN");
    }

    @Test
    void getPublicTracking_RedactsStreetAddressesAndRecipientNames() {
        when(organizationServiceClient.resolveRoute(anyString(), anyString()))
                .thenReturn(mockRouteResolution());
        when(trackingNumberGenerator.generateUniqueTrackingNumber()).thenReturn("SD-91004");

        final DeliveryOrder[] capturedOrder = new DeliveryOrder[1];
        when(orderRepository.save(any(DeliveryOrder.class))).thenAnswer(inv -> {
            DeliveryOrder o = inv.getArgument(0);
            o.setId(104L);
            capturedOrder[0] = o;
            return o;
        });

        CreateOrderRequest request = new CreateOrderRequest();
        request.setPickupContactName("Kasun Silva");
        request.setPickupContactPhone("+94 77 111 2222");
        request.setPickupAddress("120 Galle Road, Colombo 03");
        request.setPickupPostalCode("00300");
        request.setDropoffContactName("Nimal Perera");
        request.setDropoffContactPhone("+94 77 333 4444");
        request.setDropoffAddress("45 Peradeniya Road, Kandy");
        request.setDropoffPostalCode("20000");
        request.setParcelDescription("Gift Box");
        request.setParcelSize("SMALL");
        request.setWeightKg(new BigDecimal("1.0"));
        request.setPaymentMethod("COD");
        request.setCodAmount(new BigDecimal("1500.00"));

        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        orderService.createOrder(request, customer);

        com.swiftdrop.order.entity.TrackingEvent podEvent = new com.swiftdrop.order.entity.TrackingEvent();
        podEvent.setStatus(com.swiftdrop.order.entity.enums.OrderLifecycleStatus.DELIVERED);
        podEvent.setLocation("45 Peradeniya Road, Kandy");
        podEvent.setDescription("Delivered to Nimal Perera at 45 Peradeniya Road, Kandy (Recipient: Nimal Perera)");
        capturedOrder[0].addTrackingEvent(podEvent);

        when(orderRepository.findByTrackingNumberIgnoreCase("SD-91004"))
                .thenReturn(Optional.of(capturedOrder[0]));

        PublicTrackingResponse publicTracking = orderService.getPublicTracking("SD-91004");
        assertThat(publicTracking.getEvents()).isNotEmpty();
        for (PublicTrackingResponse.PublicTrackingEventDto ev : publicTracking.getEvents()) {
            assertThat(ev.getLocation()).doesNotContain("45 Peradeniya Road").doesNotContain("120 Galle Road");
            assertThat(ev.getDescription()).doesNotContain("Nimal Perera").doesNotContain("45 Peradeniya Road");
        }
    }
}

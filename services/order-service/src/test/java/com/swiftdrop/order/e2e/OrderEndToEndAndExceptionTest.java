package com.swiftdrop.order.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.client.OrganizationServiceClient;
import com.swiftdrop.order.config.CorrelationIdHolder;
import com.swiftdrop.order.config.PricingProperties;
import com.swiftdrop.order.dto.*;
import com.swiftdrop.order.entity.OrderOutboxEvent;
import com.swiftdrop.order.exception.ExternalServiceUnavailableException;
import com.swiftdrop.order.exception.InvalidBranchCoverageException;
import com.swiftdrop.order.exception.PaymentVerificationException;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderOutboxEventRepository;
import com.swiftdrop.order.repository.PricingQuoteRepository;
import com.swiftdrop.order.security.OrderJwtService;
import com.swiftdrop.order.security.OrderUserPrincipal;
import com.swiftdrop.order.service.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.amqp.AmqpConnectException;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.TestPropertySource;

import javax.crypto.SecretKey;
import java.math.BigDecimal;
import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:order_e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class OrderEndToEndAndExceptionTest {

    @Autowired
    private DeliveryOrderRepository orderRepository;

    @Autowired
    private PricingQuoteRepository quoteRepository;

    @Autowired
    private OrderOutboxEventRepository outboxRepository;

    private RabbitTemplate rabbitTemplate;
    private ApplicationEventPublisher applicationEventPublisher;
    private OrganizationServiceClient organizationServiceClient;
    private OrderEventPublisher eventPublisher;
    private OrderService orderService;
    private OrderUserPrincipal customer;

    @BeforeEach
    void setUp() {
        rabbitTemplate = mock(RabbitTemplate.class);
        applicationEventPublisher = mock(ApplicationEventPublisher.class);
        organizationServiceClient = mock(OrganizationServiceClient.class);

        eventPublisher = new OrderEventPublisher(
                rabbitTemplate,
                "swiftdrop.events",
                outboxRepository,
                applicationEventPublisher,
                new ObjectMapper()
        );

        orderService = new OrderService(
                orderRepository,
                quoteRepository,
                organizationServiceClient,
                new PricingEngineService(new PricingProperties()),
                new TrackingNumberGenerator(orderRepository),
                new AddressCoordinateResolver(),
                new OrderLifecycleService(),
                new ProvisionalPaymentVerificationService(),
                eventPublisher
        );

        customer = new OrderUserPrincipal("cust-e2e-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER"));
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void happyPathQuotePrepaidOrderInvalidPaymentThenConfirmedEmitsOrderedOutboxEventsAndSupportsTracking() {
        MDC.put(CorrelationIdHolder.MDC_KEY, "corr-order-e2e-1");
        when(organizationServiceClient.resolveRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(validRoute());

        OrderQuoteRequest quoteReq = new OrderQuoteRequest();
        quoteReq.setPickupAddress("120 Galle Road, Colombo 03");
        quoteReq.setDropoffAddress("45 Peradeniya Road, Kandy");
        quoteReq.setParcelSize("MEDIUM");
        quoteReq.setWeightKg(new BigDecimal("2.5"));
        OrderQuoteResponse quote = orderService.generateQuote(quoteReq);
        assertThat(quote.getQuoteReference()).startsWith("QT-");

        // 1. Prepaid created without verified token -> stays CREATED + PENDING_PAYMENT
        CreateOrderRequest createReq = buildOrderRequest("PREPAID", null);
        DeliveryOrderResponse created = orderService.createOrder(createReq, customer);
        assertThat(created.getStatus()).isEqualTo("CREATED");
        assertThat(created.getPaymentStatus()).isEqualTo("PENDING_PAYMENT");

        List<OrderOutboxEvent> afterCreateOutbox = outboxRepository.findByAggregateIdOrderByCreatedAtAsc(created.getTrackingNumber());
        assertThat(afterCreateOutbox).extracting(OrderOutboxEvent::getEventType)
                .containsExactly("OrderCreated");

        // 2. Exception #2: Payment verification failure rejects invalid ref and emits NO OrderConfirmed event
        PaymentConfirmationRequest badPay = new PaymentConfirmationRequest("BAD-REF-000", "PROVISIONAL", "Bad token");
        assertThatThrownBy(() -> orderService.confirmPrepaidPayment(created.getTrackingNumber(), badPay, customer))
                .isInstanceOf(PaymentVerificationException.class);
        assertThat(outboxRepository.findByAggregateIdOrderByCreatedAtAsc(created.getTrackingNumber()))
                .extracting(OrderOutboxEvent::getEventType)
                .containsExactly("OrderCreated");

        // 3. Valid verified prepaid token -> CONFIRMED + PAID + OrderConfirmed outbox persisted & published
        PaymentConfirmationRequest goodPay = new PaymentConfirmationRequest("PAY-VERIFIED-E2E-001", "PROVISIONAL", "Paid");
        DeliveryOrderResponse confirmed = orderService.confirmPrepaidPayment(created.getTrackingNumber(), goodPay, customer);
        assertThat(confirmed.getStatus()).isEqualTo("CONFIRMED");
        assertThat(confirmed.getPaymentStatus()).isEqualTo("PAID");

        List<OrderOutboxEvent> afterConfirmOutbox = outboxRepository.findByAggregateIdOrderByCreatedAtAsc(created.getTrackingNumber());
        assertThat(afterConfirmOutbox).extracting(OrderOutboxEvent::getEventType)
                .containsExactly("OrderCreated", "OrderConfirmed", "OrderStatusChanged");

        for (OrderOutboxEvent evt : afterConfirmOutbox) {
            eventPublisher.attemptPublish(evt);
        }
        verify(rabbitTemplate, times(3)).convertAndSend(
                eq("swiftdrop.events"), anyString(), any(Map.class), any(MessagePostProcessor.class));

        PublicTrackingResponse tracking = orderService.getPublicTracking(created.getTrackingNumber());
        assertThat(tracking.getStatus()).isEqualTo("CONFIRMED");
        assertThat(tracking.getTrackingNumber()).isEqualTo(created.getTrackingNumber());
    }

    @Test
    void exceptionScenarios_NoCoverageServiceDownAndBrokerDownPersistOutboxForRetry() {
        // Exception #1: Invalid branch coverage
        doThrow(new InvalidBranchCoverageException("No active origin branch covers location", "PICKUP"))
                .when(organizationServiceClient).resolveRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        assertThatThrownBy(() -> orderService.createOrder(buildOrderRequest("COD", new BigDecimal("1500.00")), customer))
                .isInstanceOf(InvalidBranchCoverageException.class);
        assertThat(orderRepository.count()).isZero();

        // Exception #11a: Organization Service unavailable
        doThrow(new ExternalServiceUnavailableException("Organization Service unavailable"))
                .when(organizationServiceClient).resolveRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        assertThatThrownBy(() -> orderService.createOrder(buildOrderRequest("COD", new BigDecimal("1500.00")), customer))
                .isInstanceOf(ExternalServiceUnavailableException.class);

        // Exception #11b: RabbitMQ broker down -> COD order saves atomically with outbox PENDING for retry
        doReturn(validRoute())
                .when(organizationServiceClient).resolveRoute(anyDouble(), anyDouble(), anyDouble(), anyDouble());
        doThrow(new AmqpConnectException(new ConnectException("Connection refused: rabbitmq:5672")))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        DeliveryOrderResponse codOrder = orderService.createOrder(buildOrderRequest("COD", new BigDecimal("2500.00")), customer);
        assertThat(codOrder.getStatus()).isEqualTo("CONFIRMED");

        List<OrderOutboxEvent> outbox = outboxRepository.findByAggregateIdOrderByCreatedAtAsc(codOrder.getTrackingNumber());
        assertThat(outbox).hasSize(2);
        assertThat(outbox).extracting(OrderOutboxEvent::getEventType)
                .containsExactly("OrderCreated", "OrderConfirmed");

        OrderOutboxEvent first = outbox.get(0);
        eventPublisher.attemptPublish(first);
        OrderOutboxEvent reloaded = outboxRepository.findById(first.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(OrderOutboxEvent.STATUS_PENDING);
        assertThat(reloaded.getRetryCount()).isEqualTo(1);
        assertThat(reloaded.getLastError()).contains("Connection refused");
        assertThat(reloaded.getNextAttemptAt()).isAfter(LocalDateTime.now().minusSeconds(1));
    }

    @Test
    void crossServiceJwtValidationSupportsAlignedBase64AndEnvExampleNonBase64Secrets() throws Exception {
        String base64Default = "Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=";
        String rawSecretSample = "test-non-base64-raw-secret-key-for-hmac-derivation-check";

        for (String secret : List.of(base64Default, rawSecretSample)) {
            OrderJwtService jwtService = new OrderJwtService(secret);
            byte[] keyBytes;
            try {
                byte[] decoded = Decoders.BASE64.decode(secret);
                keyBytes = decoded.length >= 32 ? decoded
                        : MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            } catch (Exception ex) {
                keyBytes = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            }
            SecretKey key = Keys.hmacShaKeyFor(keyBytes);
            String token = Jwts.builder()
                    .issuer(OrderJwtService.EXPECTED_ISSUER)
                    .subject("merch-e2e-1")
                    .claim("email", "ops@serendib.lk")
                    .claim("organizationId", "ORG-SERENDIB")
                    .claim("branchId", 1L)
                    .claim("roles", List.of("MERCHANT"))
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 600_000L))
                    .signWith(key)
                    .compact();

            assertThat(jwtService.validateToken(token)).isTrue();
            OrderUserPrincipal principal = jwtService.parsePrincipal(token);
            assertThat(principal.userId()).isEqualTo("merch-e2e-1");
            assertThat(principal.organizationId()).isEqualTo("ORG-SERENDIB");
            assertThat(principal.branchId()).isEqualTo(1L);

            String wrongIssuerToken = Jwts.builder()
                    .issuer("untrusted-issuer")
                    .subject("merch-e2e-1")
                    .claim("roles", List.of("MERCHANT"))
                    .issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + 600_000L))
                    .signWith(key)
                    .compact();
            assertThat(jwtService.validateToken(wrongIssuerToken)).isFalse();
        }
    }

    private RouteBranchResolutionDto validRoute() {
        RouteBranchResolutionDto dto = new RouteBranchResolutionDto();
        dto.setOriginBranch(new BranchResolutionInfoDto(1L, "CMB-CENTRAL", "Colombo Central", 1.2, true));
        dto.setDestinationBranch(new BranchResolutionInfoDto(2L, "KDY-MAIN", "Kandy Hub", 2.0, true));
        dto.setInterBranchDistanceKm(94.8);
        dto.setSameBranch(false);
        return dto;
    }

    private CreateOrderRequest buildOrderRequest(String paymentMethod, BigDecimal codAmount) {
        CreateOrderRequest req = new CreateOrderRequest();
        req.setPickupContactName("Kasun Silva");
        req.setPickupContactPhone("+94771112222");
        req.setPickupContactEmail("kasun@swiftdrop.lk");
        req.setPickupAddress("120 Galle Road, Colombo 03");
        req.setDropoffContactName("Amaya Fernando");
        req.setDropoffContactPhone("+94773334444");
        req.setDropoffContactEmail("amaya@swiftdrop.lk");
        req.setDropoffAddress("45 Peradeniya Road, Kandy");
        req.setParcelDescription("Roasted coffee beans");
        req.setParcelSize("MEDIUM");
        req.setWeightKg(new BigDecimal("2.5"));
        req.setPaymentMethod(paymentMethod);
        req.setCodAmount(codAmount);
        req.setPickupMethod("COURIER_PICKUP");
        return req;
    }
}

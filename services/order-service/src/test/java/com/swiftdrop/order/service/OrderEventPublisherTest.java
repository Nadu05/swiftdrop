package com.swiftdrop.order.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.config.CorrelationIdHolder;
import com.swiftdrop.order.entity.DeliveryAddress;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.OrderOutboxEvent;
import com.swiftdrop.order.entity.enums.*;
import com.swiftdrop.order.repository.OrderOutboxEventRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.MDC;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private OrderOutboxEventRepository outboxRepository;

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    private OrderEventPublisher publisher;
    private DeliveryOrder sampleOrder;

    @BeforeEach
    void setUp() {
        publisher = new OrderEventPublisher(
                rabbitTemplate,
                "swiftdrop.events",
                outboxRepository,
                applicationEventPublisher,
                new ObjectMapper()
        );

        sampleOrder = new DeliveryOrder();
        sampleOrder.setId(501L);
        sampleOrder.setTrackingNumber("SD-50101");
        sampleOrder.setCustomerUserId("usr-cust-501");
        sampleOrder.setCustomerEmail("customer@swiftdrop.lk");
        sampleOrder.setOrderSourceType(OrderSourceType.CUSTOMER);
        sampleOrder.setPickupMethod(PickupMethod.COURIER_PICKUP);
        sampleOrder.setPaymentMethod(PaymentMethod.PREPAID);
        sampleOrder.setPaymentStatus(PaymentStatus.PAID);
        sampleOrder.setStatus(OrderLifecycleStatus.CONFIRMED);
        sampleOrder.setOriginBranchId(1L);
        sampleOrder.setOriginBranchCode("CMB-01");
        sampleOrder.setOriginBranchName("Colombo Central");
        sampleOrder.setDestinationBranchId(2L);
        sampleOrder.setDestinationBranchCode("KDY-01");
        sampleOrder.setDestinationBranchName("Kandy Hub");
        sampleOrder.setDeliveryFee(new BigDecimal("1250.00"));
        sampleOrder.setCurrency("LKR");

        DeliveryAddress pickup = new DeliveryAddress();
        pickup.setContactName("Kasun");
        pickup.setContactEmail("kasun@swiftdrop.lk");
        sampleOrder.setPickupDetails(pickup);

        DeliveryAddress dropoff = new DeliveryAddress();
        dropoff.setContactName("Amaya");
        dropoff.setContactEmail("amaya@swiftdrop.lk");
        sampleOrder.setDropoffDetails(dropoff);
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    void publishOrderConfirmed_EnqueuesOutboxBeforeCommitAndPublishesAfterCommit() {
        MDC.put(CorrelationIdHolder.MDC_KEY, "corr-order-501");
        when(outboxRepository.save(any(OrderOutboxEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        publisher.publishOrderConfirmed(sampleOrder);

        ArgumentCaptor<OrderOutboxEvent> captor = ArgumentCaptor.forClass(OrderOutboxEvent.class);
        verify(outboxRepository).save(captor.capture());
        OrderOutboxEvent outbox = captor.getValue();

        assertThat(outbox.getEventType()).isEqualTo("OrderConfirmed");
        assertThat(outbox.getRoutingKey()).isEqualTo("order.confirmed");
        assertThat(outbox.getCorrelationId()).isEqualTo("corr-order-501");
        assertThat(outbox.getPayloadJson()).contains("SD-50101").contains("customer@swiftdrop.lk").contains("amaya@swiftdrop.lk");

        // Must never publish directly before transaction commit
        verifyNoInteractions(rabbitTemplate);
        verify(applicationEventPublisher).publishEvent(any(OrderEventPublisher.OutboxSavedSignal.class));

        publisher.attemptPublish(outbox);
        verify(rabbitTemplate).convertAndSend(
                eq("swiftdrop.events"),
                eq("order.confirmed"),
                any(Map.class),
                any(MessagePostProcessor.class)
        );
        assertThat(outbox.getStatus()).isEqualTo(OrderOutboxEvent.STATUS_PUBLISHED);
    }

    @Test
    void attemptPublish_WhenBrokerDown_RetainsPendingWithBackoffRetry() {
        OrderOutboxEvent row = new OrderOutboxEvent();
        row.setEventId("evt-order-retry");
        row.setEventType("OrderCreated");
        row.setRoutingKey("order.created");
        row.setAggregateId("SD-50101");
        row.setPayloadJson("{\"eventType\":\"OrderCreated\",\"trackingNumber\":\"SD-50101\"}");
        row.setStatus(OrderOutboxEvent.STATUS_PENDING);
        row.setRetryCount(0);
        row.setMaxRetries(5);

        doThrow(new RuntimeException("Broker offline"))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class), any(MessagePostProcessor.class));

        publisher.attemptPublish(row);

        assertThat(row.getStatus()).isEqualTo(OrderOutboxEvent.STATUS_PENDING);
        assertThat(row.getRetryCount()).isEqualTo(1);
        assertThat(row.getLastError()).contains("Broker offline");
    }
}


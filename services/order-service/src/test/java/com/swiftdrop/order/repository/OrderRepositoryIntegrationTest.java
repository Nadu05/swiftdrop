package com.swiftdrop.order.repository;

import com.swiftdrop.order.entity.*;
import com.swiftdrop.order.entity.enums.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class OrderRepositoryIntegrationTest {

    @Autowired
    private DeliveryOrderRepository orderRepository;

    @Autowired
    private PricingQuoteRepository quoteRepository;

    @Test
    void saveAndFindDeliveryOrder_PersistsParcelAddressTrackingAndPaymentGraph() {
        PricingQuote quote = new PricingQuote();
        quote.setQuoteReference("QT-2026-1001");
        quote.setPickupAddress("120 Galle Road, Colombo 03");
        quote.setPickupLatitude(6.9271);
        quote.setPickupLongitude(79.8612);
        quote.setDropoffAddress("45 Peradeniya Road, Kandy");
        quote.setDestinationLatitude(7.2906);
        quote.setDestinationLongitude(80.6337);
        quote.setOriginBranchId(1L);
        quote.setOriginBranchCode("CMB-CENTRAL");
        quote.setOriginBranchName("Colombo Central Hub");
        quote.setDestinationBranchId(2L);
        quote.setDestinationBranchCode("KDY-MAIN");
        quote.setDestinationBranchName("Kandy Regional Hub");
        quote.setSameBranch(false);
        quote.setParcelSize(ParcelSize.MEDIUM);
        quote.setWeightKg(new BigDecimal("2.50"));
        quote.setEstimatedDistanceKm(new BigDecimal("98.50"));
        quote.setBaseFee(new BigDecimal("450.00"));
        quote.setDistanceFee(new BigDecimal("4432.50"));
        quote.setWeightFee(new BigDecimal("112.50"));
        quote.setSizeSurcharge(new BigDecimal("250.00"));
        quote.setEstimatedFee(new BigDecimal("5245.00"));
        quote.setCurrency("LKR");
        quote.setProvisionalPricing(true);
        quote.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        PricingQuote savedQuote = quoteRepository.save(quote);

        DeliveryOrder order = new DeliveryOrder();
        order.setTrackingNumber("SD-54321");
        order.setOrderSourceType(OrderSourceType.CUSTOMER);
        order.setCustomerUserId("cust-user-1");
        order.setCustomerEmail("customer@swiftdrop.lk");
        order.setStatus(OrderLifecycleStatus.CONFIRMED);
        order.setPickupMethod(PickupMethod.COURIER_PICKUP);
        order.setPaymentMethod(PaymentMethod.COD);
        order.setPaymentStatus(PaymentStatus.COD_PENDING_COLLECTION);
        order.setPickupDetails(new DeliveryAddress(
                "120 Galle Road, Colombo 03",
                "Colombo",
                "00300",
                6.9271,
                79.8612,
                "Kasun Silva",
                "+94 77 111 2222",
                "kasun@swiftdrop.lk"
        ));
        order.setDropoffDetails(new DeliveryAddress(
                "45 Peradeniya Road, Kandy",
                "Kandy",
                "20000",
                7.2906,
                80.6337,
                "Nimal Perera",
                "+94 77 333 4444",
                "nimal@swiftdrop.lk"
        ));
        order.setOriginBranchId(1L);
        order.setOriginBranchCode("CMB-CENTRAL");
        order.setOriginBranchName("Colombo Central Hub");
        order.setDestinationBranchId(2L);
        order.setDestinationBranchCode("KDY-MAIN");
        order.setDestinationBranchName("Kandy Regional Hub");
        order.setSameBranch(false);
        order.setDistanceKm(new BigDecimal("98.50"));
        order.setQuoteReference(savedQuote.getQuoteReference());
        order.setBaseFee(new BigDecimal("450.00"));
        order.setDistanceFee(new BigDecimal("4432.50"));
        order.setWeightFee(new BigDecimal("112.50"));
        order.setSizeSurcharge(new BigDecimal("250.00"));
        order.setDeliveryFee(new BigDecimal("5245.00"));
        order.setCodAmount(new BigDecimal("12500.00"));
        order.setCurrency("LKR");

        Parcel parcel = new Parcel();
        parcel.setParcelSize(ParcelSize.MEDIUM);
        parcel.setWeightKg(new BigDecimal("2.50"));
        parcel.setDeclaredValue(new BigDecimal("12500.00"));
        parcel.setDescription("Electronics package");
        parcel.setFragile(true);
        order.setParcel(parcel);

        TrackingEvent event = new TrackingEvent();
        event.setStatus(OrderLifecycleStatus.CONFIRMED);
        event.setLocation("Colombo Central Hub");
        event.setDescription("Order confirmed");
        event.setActorId("cust-user-1");
        event.setActorRole("CUSTOMER");
        order.addTrackingEvent(event);

        PaymentReference paymentRef = new PaymentReference();
        paymentRef.setPaymentMethod(PaymentMethod.COD);
        paymentRef.setPaymentStatus(PaymentStatus.COD_PENDING_COLLECTION);
        paymentRef.setDeliveryFeeAmount(new BigDecimal("5245.00"));
        paymentRef.setCodCollectionAmount(new BigDecimal("12500.00"));
        paymentRef.setCurrency("LKR");
        paymentRef.setGatewayProvider("CASH_ON_DELIVERY");
        paymentRef.setVerified(false);
        order.addPaymentReference(paymentRef);

        DeliveryOrder savedOrder = orderRepository.saveAndFlush(order);

        assertThat(savedOrder.getId()).isNotNull();
        assertThat(orderRepository.existsByTrackingNumberIgnoreCase("sd-54321")).isTrue();

        Optional<DeliveryOrder> fetched = orderRepository.findByTrackingNumberIgnoreCase("SD-54321");
        assertThat(fetched).isPresent();
        assertThat(fetched.get().getParcel().getDescription()).isEqualTo("Electronics package");
        assertThat(fetched.get().getDeliveryFee()).isEqualByComparingTo("5245.00");
        assertThat(fetched.get().getCodAmount()).isEqualByComparingTo("12500.00");
        assertThat(fetched.get().getTrackingEvents()).hasSize(1);
        assertThat(fetched.get().getPaymentReferences()).hasSize(1);

        List<DeliveryOrder> customerOrders = orderRepository.findByCustomerUserIdOrderByCreatedAtDesc("cust-user-1");
        assertThat(customerOrders).hasSize(1);
    }
}

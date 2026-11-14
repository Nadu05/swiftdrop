package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.OrderStatusUpdateRequest;
import com.swiftdrop.order.entity.DeliveryAddress;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.entity.enums.OrderLifecycleStatus;
import com.swiftdrop.order.entity.enums.PaymentMethod;
import com.swiftdrop.order.entity.enums.PaymentStatus;
import com.swiftdrop.order.entity.enums.PickupMethod;
import com.swiftdrop.order.exception.InvalidOrderStateTransitionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderLifecycleServiceTest {

    private OrderLifecycleService lifecycleService;

    @BeforeEach
    void setUp() {
        lifecycleService = new OrderLifecycleService();
    }

    private DeliveryOrder buildOrder(PickupMethod pickupMethod, OrderLifecycleStatus initialStatus) {
        DeliveryOrder order = new DeliveryOrder();
        order.setTrackingNumber("SD-88421");
        order.setPickupMethod(pickupMethod);
        order.setStatus(initialStatus);
        order.setOriginBranchName("Colombo Central Hub");
        order.setDestinationBranchName("Kandy Regional Hub");
        order.setPaymentMethod(PaymentMethod.COD);
        order.setPaymentStatus(PaymentStatus.COD_PENDING_COLLECTION);
        order.setDropoffDetails(new DeliveryAddress(
                "45 Peradeniya Road, Kandy",
                "Kandy",
                "20000",
                7.2906,
                80.6337,
                "Nimal Perera",
                "+94 77 123 4567",
                "nimal@swiftdrop.lk"
        ));
        return order;
    }

    @Test
    void fullCourierPickupLifecycle_TransitionsThroughAllNormalStatusesAndAppendsTrackingEvents() {
        DeliveryOrder order = buildOrder(PickupMethod.COURIER_PICKUP, OrderLifecycleStatus.CONFIRMED);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.PICKUP_ASSIGNED, null, "disp-1", "DISPATCHER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.PICKUP_ASSIGNED);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.PICKED_UP, null, "cour-1", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.PICKED_UP);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.AT_ORIGIN_BRANCH, null, "cour-1", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.AT_ORIGIN_BRANCH);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.IN_TRANSIT, null, "cour-2", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.IN_TRANSIT);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.AT_DESTINATION_BRANCH, null, "cour-2", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.AT_DESTINATION_BRANCH);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.OUT_FOR_DELIVERY, null, "cour-3", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.OUT_FOR_DELIVERY);

        OrderStatusUpdateRequest deliveryProof = new OrderStatusUpdateRequest();
        deliveryProof.setStatus("DELIVERED");
        deliveryProof.setRecipientConfirmedName("Nimal Perera");
        deliveryProof.setSignatureReference("SIG-2026-88421");
        deliveryProof.setPhotoEvidenceUrl("https://cdn.swiftdrop.lk/pod/SD-88421.jpg");

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.DELIVERED, deliveryProof, "cour-3", "COURIER");

        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.DELIVERED);
        assertThat(order.getRecipientConfirmedName()).isEqualTo("Nimal Perera");
        assertThat(order.getSignatureReference()).isEqualTo("SIG-2026-88421");
        assertThat(order.getPhotoEvidenceUrl()).isEqualTo("https://cdn.swiftdrop.lk/pod/SD-88421.jpg");
        assertThat(order.getDeliveredAt()).isNotNull();
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.COD_COLLECTED);
        assertThat(order.getTrackingEvents()).hasSize(7);
    }

    @Test
    void branchDropoffOrder_TransitionsDirectlyToAtOriginBranchAndRejectsPickupAssigned() {
        DeliveryOrder order = buildOrder(PickupMethod.BRANCH_DROPOFF, OrderLifecycleStatus.CONFIRMED);

        assertThatThrownBy(() -> lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.PICKUP_ASSIGNED,
                null,
                "disp-1",
                "DISPATCHER"
        ))
                .isInstanceOf(InvalidOrderStateTransitionException.class)
                .hasMessageContaining("Branch drop-off order")
                .hasMessageContaining("does not require courier pickup assignment");

        lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                null,
                "cust-1",
                "CUSTOMER"
        );

        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.AT_ORIGIN_BRANCH);
        assertThat(order.getTrackingEvents()).hasSize(1);
        assertThat(order.getTrackingEvents().get(0).getDescription())
                .contains("Parcel dropped off directly at origin branch");
    }

    @Test
    void courierPickupOrder_RejectsDirectJumpFromConfirmedToAtOriginBranch() {
        DeliveryOrder order = buildOrder(PickupMethod.COURIER_PICKUP, OrderLifecycleStatus.CONFIRMED);

        assertThatThrownBy(() -> lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.AT_ORIGIN_BRANCH,
                null,
                "disp-1",
                "DISPATCHER"
        ))
                .isInstanceOf(InvalidOrderStateTransitionException.class)
                .hasMessageContaining("must be assigned and picked up before arriving at origin branch");
    }

    @Test
    void failedDeliveryAttempts_EscalatesToPendingDispatcherDecisionOnThirdAttemptAndAllowsReturnToSender() {
        DeliveryOrder order = buildOrder(PickupMethod.COURIER_PICKUP, OrderLifecycleStatus.OUT_FOR_DELIVERY);

        // Attempt 1 fails -> stays DELIVERY_FAILED
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.DELIVERY_FAILED, null, "cour-1", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.DELIVERY_FAILED);
        assertThat(order.getFailedAttemptCount()).isEqualTo(1);

        // Retry 2 -> OUT_FOR_DELIVERY -> DELIVERY_FAILED
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.OUT_FOR_DELIVERY, null, "cour-1", "COURIER");
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.DELIVERY_FAILED, null, "cour-1", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.DELIVERY_FAILED);
        assertThat(order.getFailedAttemptCount()).isEqualTo(2);

        // Retry 3 -> OUT_FOR_DELIVERY -> 3rd failure automatically escalates to PENDING_DISPATCHER_DECISION (BD-02, BD-07)
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.OUT_FOR_DELIVERY, null, "cour-1", "COURIER");
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.DELIVERY_FAILED, null, "cour-1", "COURIER");
        assertThat(order.getFailedAttemptCount()).isEqualTo(3);
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.PENDING_DISPATCHER_DECISION);

        // Dispatcher chooses RETURN_TO_SENDER -> RETURNED_TO_SENDER
        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.RETURN_TO_SENDER, null, "disp-1", "DISPATCHER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.RETURN_TO_SENDER);

        lifecycleService.validateAndTransition(order, OrderLifecycleStatus.RETURNED_TO_SENDER, null, "cour-1", "COURIER");
        assertThat(order.getStatus()).isEqualTo(OrderLifecycleStatus.RETURNED_TO_SENDER);

        // Terminal state cannot transition further
        assertThatThrownBy(() -> lifecycleService.validateAndTransition(
                order,
                OrderLifecycleStatus.OUT_FOR_DELIVERY,
                null,
                "disp-1",
                "DISPATCHER"
        ))
                .isInstanceOf(InvalidOrderStateTransitionException.class)
                .hasMessageContaining("terminal state");
    }
}

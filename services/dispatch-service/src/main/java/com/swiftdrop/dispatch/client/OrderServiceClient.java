package com.swiftdrop.dispatch.client;

public interface OrderServiceClient {

    OrderSummaryDto getOrderByIdOrTracking(String orderIdOrTracking);

    void notifyStatusTransition(
            String orderIdOrTracking,
            OrderStatusTransitionPayload payload,
            String actorId,
            String actorRole
    );

    void notifyBranchDropoff(
            String orderIdOrTracking,
            String notes,
            String actorId,
            String actorRole
    );
}

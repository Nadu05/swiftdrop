package com.swiftdrop.dispatch.client;

import java.util.List;

public interface OrderServiceClient {

    OrderSummaryDto getOrderByIdOrTracking(String orderIdOrTracking);

    default List<OrderSummaryDto> getOrdersForBranch(Long branchId) {
        return List.of();
    }

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



package com.swiftdrop.dispatch.dto.courier;

import com.swiftdrop.dispatch.entity.enums.CourierStatus;
import com.swiftdrop.dispatch.entity.enums.VehicleType;

/**
 * The signed-in courier's own profile and current workload.
 * {@code branchId} is an Organization service reference; the branch name is resolved by the client.
 */
public record CourierProfileResponse(
        Long id,
        String courierCode,
        String name,
        String phone,
        CourierStatus status,
        VehicleType vehicleType,
        String vehiclePlate,
        Long branchId,
        int maxCapacity,
        int activeDeliveries
) {
}

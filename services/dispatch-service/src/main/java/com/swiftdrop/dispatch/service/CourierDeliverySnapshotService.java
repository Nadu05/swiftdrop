package com.swiftdrop.dispatch.service;

import com.swiftdrop.dispatch.dto.OrderDetailsDto;
import com.swiftdrop.dispatch.entity.Assignment;
import com.swiftdrop.dispatch.entity.CourierDelivery;
import com.swiftdrop.dispatch.repository.CourierDeliveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Hand-off point for the dispatcher assignment flow: call {@link #recordSnapshot} right after an
 * {@link Assignment} is saved so the courier can see who to collect from and deliver to.
 *
 * <p>Dispatch keeps only this minimal copy of the order (guide §3: "Dispatch receives the minimum
 * required order data"). Calling it again for the same assignment updates the snapshot.
 *
 * <p>{@code OrderDetailsDto} does not yet carry Order's {@code pickupAddress}/{@code pickupCity}
 * (order-service docs/dispatch-contract.md, change 2); pass them separately once available.
 */
@Service
public class CourierDeliverySnapshotService {

    private final CourierDeliveryRepository deliveryRepository;

    public CourierDeliverySnapshotService(CourierDeliveryRepository deliveryRepository) {
        this.deliveryRepository = deliveryRepository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public CourierDelivery recordSnapshot(Assignment assignment, OrderDetailsDto order,
                                          String pickupAddress, String pickupCity, BigDecimal payoutAmount) {
        CourierDelivery delivery = deliveryRepository.findByAssignmentId(assignment.getId())
                .orElseGet(() -> new CourierDelivery(assignment));
        delivery.setTrackingNumber(order.getTrackingNumber());
        delivery.setPriority(order.getPriority());
        delivery.setRecipientName(order.getRecipientName());
        delivery.setRecipientPhone(order.getRecipientPhone());
        delivery.setDeliveryAddress(order.getDeliveryAddress());
        delivery.setDeliveryCity(order.getCity());
        delivery.setPickupName(order.getMerchantName());
        delivery.setPickupPhone(order.getMerchantContact());
        delivery.setPickupAddress(pickupAddress);
        delivery.setPickupCity(pickupCity);
        delivery.setPackageType(order.getPackageType());
        delivery.setWeightKg(order.getWeightKg() == null ? null : BigDecimal.valueOf(order.getWeightKg()));
        delivery.setHandlingNotes(order.getHandlingNotes());
        delivery.setPayoutAmount(payoutAmount);
        return deliveryRepository.save(delivery);
    }
}

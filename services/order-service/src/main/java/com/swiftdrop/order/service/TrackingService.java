package com.swiftdrop.order.service;

import com.swiftdrop.order.dto.PublicTrackingEventResponse;
import com.swiftdrop.order.dto.PublicTrackingResponse;
import com.swiftdrop.order.entity.DeliveryOrder;
import com.swiftdrop.order.exception.ResourceNotFoundException;
import com.swiftdrop.order.location.City;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.repository.DeliveryOrderRepository;
import com.swiftdrop.order.repository.OrderStatusHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Public parcel tracking: anyone holding a tracking number can see the parcel's status and timeline, and
 * nothing else. The result is built only from the allow-list in {@link PublicTrackingResponse}.
 */
@Service
public class TrackingService {

    /** Shape of numbers made by {@link TrackingNumberGenerator}; anything else cannot exist, so skip the database. */
    private static final Pattern TRACKING_NUMBER = Pattern.compile("^[A-Z0-9][A-Z0-9-]{5,29}$");
    private static final String NOT_FOUND = "Tracking number not found";

    private final DeliveryOrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final CityDirectory cities;

    public TrackingService(DeliveryOrderRepository orders, OrderStatusHistoryRepository history, CityDirectory cities) {
        this.orders = orders;
        this.history = history;
        this.cities = cities;
    }

    /**
     * @throws ResourceNotFoundException for an unknown number and for a malformed one, with the same message,
     *                                   so a caller cannot tell the two apart or probe which numbers exist
     */
    @Transactional(readOnly = true)
    public PublicTrackingResponse track(String rawTrackingNumber) {
        String trackingNumber = normalise(rawTrackingNumber);
        DeliveryOrder order = orders.findByTrackingNumber(trackingNumber)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        var events = history.findByOrderIdOrderByCreatedAtAscIdAsc(order.getId()).stream()
                .map(PublicTrackingEventResponse::from)
                .toList();
        return new PublicTrackingResponse(
                order.getTrackingNumber(),
                order.getStatus(),
                order.getStatus().label(),
                townName(order.getPickupCity()),
                townName(order.getDropoffCity()),
                order.getParcelSize(),
                order.getDistanceKm(),
                order.getUpdatedAt(),
                events);
    }

    private static String normalise(String raw) {
        String candidate = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (!TRACKING_NUMBER.matcher(candidate).matches()) {
            throw new ResourceNotFoundException(NOT_FOUND);
        }
        return candidate;
    }

    /** The town's display name; null for older orders that were placed before towns were recorded. */
    private String townName(String code) {
        return code == null ? null : cities.find(code).map(City::name).orElse(null);
    }
}

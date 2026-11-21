package com.swiftdrop.order.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

/**
 * Resolves coordinates when text-only addresses are submitted by the customer booking UI,
 * and computes Haversine distances for route estimation.
 */
@Component
public class AddressCoordinateResolver {

    private static final double EARTH_RADIUS_KM = 6371.0088;

    public record Coordinates(double latitude, double longitude) {
    }

    public Coordinates resolveCoordinates(Double explicitLatitude, Double explicitLongitude, String addressText, boolean isDestination) {
        if (explicitLatitude != null && explicitLongitude != null) {
            return new Coordinates(explicitLatitude, explicitLongitude);
        }
        if (addressText == null || addressText.isBlank()) {
            return isDestination
                    ? new Coordinates(6.9147, 79.8580)
                    : new Coordinates(6.9271, 79.8612);
        }

        String lower = addressText.trim().toLowerCase(Locale.ROOT);
        if (lower.contains("dehiwala") || lower.contains("mount lavinia") || lower.contains("wellawatte")) {
            return new Coordinates(6.8511, 79.8653);
        }
        if (lower.contains("rajagiriya") || lower.contains("nawala") || lower.contains("kotte") || lower.contains("battaramulla")) {
            return new Coordinates(6.9094, 79.8950);
        }
        if (lower.contains("nugegoda") || lower.contains("maharagama") || lower.contains("kohuwala")) {
            return new Coordinates(6.8729, 79.8886);
        }
        if (lower.contains("kollupitiya") || lower.contains("colombo 03") || lower.contains("galle road")) {
            return new Coordinates(6.9150, 79.8550);
        }
        if (lower.contains("bambalapitiya") || lower.contains("colombo 04")) {
            return new Coordinates(6.8935, 79.8558);
        }
        if (lower.contains("horton place") || lower.contains("cinnamon gardens") || lower.contains("colombo 07")) {
            return new Coordinates(6.9117, 79.8646);
        }
        if (lower.contains("union place") || lower.contains("slave island") || lower.contains("colombo 02") || lower.contains("fort") || lower.contains("colombo 01")) {
            return new Coordinates(6.9215, 79.8585);
        }
        if (lower.contains("kandy") || lower.contains("peradeniya")) {
            return new Coordinates(7.2906, 80.6337);
        }
        if (lower.contains("galle")) {
            return new Coordinates(6.0535, 80.2210);
        }
        if (lower.contains("jaffna")) {
            return new Coordinates(9.6615, 80.0255);
        }

        // Default within Colombo Central / Kollupitiya service area with slight offset between pickup & dropoff
        return isDestination
                ? new Coordinates(6.9147, 79.8580)
                : new Coordinates(6.9271, 79.8612);
    }

    public double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double rawKm = EARTH_RADIUS_KM * c;
        return BigDecimal.valueOf(Math.max(0.5, rawKm))
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}


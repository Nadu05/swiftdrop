package com.swiftdrop.order.location;

/**
 * Great-circle (straight-line) distance between two coordinates using the Haversine formula.
 * Stateless and free of framework dependencies.
 */
public final class DistanceCalculator {

    /** Mean radius of the Earth in kilometres. */
    public static final double EARTH_RADIUS_KM = 6371.0;

    private DistanceCalculator() {
    }

    /** @return distance in kilometres, never negative or NaN */
    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        if (Double.compare(lat1, lat2) == 0 && Double.compare(lon1, lon2) == 0) {
            return 0.0;
        }
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double sinHalfPhi = Math.sin(deltaPhi / 2.0);
        double sinHalfLambda = Math.sin(deltaLambda / 2.0);
        double a = sinHalfPhi * sinHalfPhi + Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda;
        a = Math.max(0.0, Math.min(1.0, a)); // guard against rounding pushing it out of [0, 1]

        return EARTH_RADIUS_KM * 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    }
}

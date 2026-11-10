package com.swiftdrop.organization.util;

/**
 * Utility for calculating the great-circle distance between two geographic points
 * on Earth using the Haversine formula.
 *
 * <p>This utility is completely stateless and independent of Spring or database classes.</p>
 */
public final class HaversineDistanceCalculator {

    /** Mean radius of the Earth in kilometers. */
    public static final double EARTH_RADIUS_KM = 6371.0;

    private HaversineDistanceCalculator() {
        // Prevent instantiation of utility class
    }

    /**
     * Calculates the great-circle distance in kilometers between two geographic coordinates.
     *
     * @param lat1 latitude of point 1 in decimal degrees (-90.0 to 90.0)
     * @param lon1 longitude of point 1 in decimal degrees (-180.0 to 180.0)
     * @param lat2 latitude of point 2 in decimal degrees (-90.0 to 90.0)
     * @param lon2 longitude of point 2 in decimal degrees (-180.0 to 180.0)
     * @return distance in kilometers, guaranteed non-negative and non-NaN
     */
    public static double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        if (Double.compare(lat1, lat2) == 0 && Double.compare(lon1, lon2) == 0) {
            return 0.0;
        }

        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double sinHalfDeltaPhi = Math.sin(deltaPhi / 2.0);
        double sinHalfDeltaLambda = Math.sin(deltaLambda / 2.0);

        double a = (sinHalfDeltaPhi * sinHalfDeltaPhi)
                + (Math.cos(phi1) * Math.cos(phi2) * sinHalfDeltaLambda * sinHalfDeltaLambda);

        // Clamp 'a' between 0.0 and 1.0 to prevent numerical inaccuracies producing NaN
        a = Math.max(0.0, Math.min(1.0, a));

        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

        return EARTH_RADIUS_KM * c;
    }
}


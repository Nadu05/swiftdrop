package com.swiftdrop.order.location;

import java.util.Map;
import java.util.Optional;

/**
 * Sri Lanka's nine provinces and the district each of the 25 districts belongs to.
 *
 * <p>A town ({@link City}) already carries its district, so the province of a town is always derived from it
 * here instead of being sent by clients; that keeps the stored province, district and town consistent.
 */
public final class Provinces {

    private static final Map<String, String> PROVINCE_BY_DISTRICT = Map.ofEntries(
            Map.entry("Colombo", "Western"),
            Map.entry("Gampaha", "Western"),
            Map.entry("Kalutara", "Western"),
            Map.entry("Kandy", "Central"),
            Map.entry("Matale", "Central"),
            Map.entry("Nuwara Eliya", "Central"),
            Map.entry("Galle", "Southern"),
            Map.entry("Matara", "Southern"),
            Map.entry("Hambantota", "Southern"),
            Map.entry("Jaffna", "Northern"),
            Map.entry("Kilinochchi", "Northern"),
            Map.entry("Mannar", "Northern"),
            Map.entry("Mullaitivu", "Northern"),
            Map.entry("Vavuniya", "Northern"),
            Map.entry("Ampara", "Eastern"),
            Map.entry("Batticaloa", "Eastern"),
            Map.entry("Trincomalee", "Eastern"),
            Map.entry("Kurunegala", "North Western"),
            Map.entry("Puttalam", "North Western"),
            Map.entry("Anuradhapura", "North Central"),
            Map.entry("Polonnaruwa", "North Central"),
            Map.entry("Badulla", "Uva"),
            Map.entry("Monaragala", "Uva"),
            Map.entry("Kegalle", "Sabaragamuwa"),
            Map.entry("Ratnapura", "Sabaragamuwa"));

    private Provinces() {
    }

    /** The province of a district (exact district name, e.g. {@code "Kandy"}), or empty for an unknown district. */
    public static Optional<String> of(String district) {
        return Optional.ofNullable(district).map(String::trim).map(PROVINCE_BY_DISTRICT::get);
    }

    /** The province of a town, or {@code null} when its district is not in the list. */
    public static String of(City city) {
        return city == null ? null : of(city.district()).orElse(null);
    }
}

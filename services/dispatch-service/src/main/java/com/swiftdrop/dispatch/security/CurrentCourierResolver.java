package com.swiftdrop.dispatch.security;

import com.swiftdrop.dispatch.exception.CourierPortalException;
import com.swiftdrop.dispatch.repository.CourierRepository;
import org.springframework.stereotype.Component;

/**
 * Works out which courier is calling the courier portal endpoints.
 *
 * <p>Uses the same identity headers as the rest of dispatch-service ({@code AssignmentController}):
 * {@code X-User-Id} (Identity user id) and {@code X-User-Role}. The courier is the row in
 * {@code couriers} whose {@code user_id} matches.
 *
 * <p><strong>Temporary:</strong> until Identity login and Gateway header injection exist (Member 01), the
 * frontend sends these headers itself in development. Once the Gateway sets them from the JWT, nothing
 * here needs to change.
 */
@Component
public class CurrentCourierResolver {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLE_HEADER = "X-User-Role";
    private static final String COURIER_ROLE = "COURIER";

    private final CourierRepository courierRepository;

    public CurrentCourierResolver(CourierRepository courierRepository) {
        this.courierRepository = courierRepository;
    }

    /**
     * @return the calling courier's database id
     * @throws CourierPortalException 401 when identity is missing or invalid, 403 when the role is not COURIER,
     *                                404 when no courier profile is linked to the user
     */
    public Long resolveCourierId(String userIdHeader, String roleHeader) {
        if (userIdHeader == null || userIdHeader.isBlank() || roleHeader == null || roleHeader.isBlank()) {
            throw CourierPortalException.unauthenticated("Missing courier identity.");
        }
        if (!COURIER_ROLE.equals(roleHeader.trim().toUpperCase())) {
            throw CourierPortalException.forbidden("Only couriers can use the courier portal.");
        }
        long userId;
        try {
            userId = Long.parseLong(userIdHeader.trim());
        } catch (NumberFormatException ex) {
            throw CourierPortalException.unauthenticated("Invalid courier identity.");
        }
        if (userId <= 0) {
            throw CourierPortalException.unauthenticated("Invalid courier identity.");
        }
        return courierRepository.findByUserId(userId)
                .orElseThrow(() -> CourierPortalException.notFound("No courier profile is linked to this account."))
                .getId();
    }
}

package com.swiftdrop.organization.entity.enums;

import java.util.EnumSet;
import java.util.Set;

/**
 * Lifecycle status of a merchant organization profile.
 *
 * <p>Allowed transitions (enforced by {@link #canTransitionTo(MerchantStatus)}):</p>
 * <ul>
 *   <li>PENDING &rarr; APPROVED (approve)</li>
 *   <li>PENDING &rarr; REJECTED (reject)</li>
 *   <li>APPROVED &rarr; SUSPENDED (suspend)</li>
 *   <li>SUSPENDED &rarr; APPROVED (reactivate)</li>
 * </ul>
 *
 * <p>REJECTED is terminal in the MVP. Resubmission of a rejected application is a
 * documented future enhancement and is intentionally not supported.</p>
 */
public enum MerchantStatus {
    PENDING,
    APPROVED,
    REJECTED,
    SUSPENDED;

    public Set<MerchantStatus> allowedNextStatuses() {
        return switch (this) {
            case PENDING -> EnumSet.of(APPROVED, REJECTED);
            case APPROVED -> EnumSet.of(SUSPENDED);
            case SUSPENDED -> EnumSet.of(APPROVED);
            case REJECTED -> EnumSet.noneOf(MerchantStatus.class);
        };
    }

    public boolean canTransitionTo(MerchantStatus target) {
        return target != null && allowedNextStatuses().contains(target);
    }
}


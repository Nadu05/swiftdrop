package com.swiftdrop.organization.exception;

import com.swiftdrop.organization.entity.enums.MerchantStatus;

/**
 * Thrown when a merchant lifecycle command is not allowed from the merchant's current status
 * (for example approving an already APPROVED merchant). Mapped to HTTP 409 Conflict.
 */
public class InvalidMerchantStatusTransitionException extends RuntimeException {

    public InvalidMerchantStatusTransitionException(Long merchantId, MerchantStatus current, MerchantStatus target) {
        super(String.format("Merchant %d cannot transition from %s to %s. Allowed next statuses from %s: %s",
                merchantId, current, target, current, current.allowedNextStatuses()));
    }
}


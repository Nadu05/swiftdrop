package com.swiftdrop.order.service;

import java.math.BigDecimal;

/**
 * Payment gateway integration boundary (Requirement 7, BD-01).
 *
 * Strictly verifies prepaid payment confirmation references before marking any online
 * payment as {@code PAID}.
 */
public interface PaymentVerificationPort {

    record VerificationResult(
            boolean verified,
            String gatewayProvider,
            String externalTransactionRef,
            String message
    ) {
    }

    VerificationResult verifyPrepaidTransaction(
            String externalTransactionRef,
            BigDecimal expectedAmount,
            String currency
    );
}


package com.swiftdrop.order.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Provisional payment verification abstraction boundary.
 *
 * <p>Integration Boundary Note (BD-01 / UD-01):
 * External payment gateway credentials are not yet configured in production.
 * In accordance with Requirement 7 ("Do not falsely mark an online payment as successful
 * without verified payment confirmation"), this service NEVER marks a prepaid order as
 * {@code PAID} unless an explicit verified transaction reference (e.g. {@code PAY-VERIFIED-*}
 * or {@code TXN-VERIFIED-*}) is presented and validated.</p>
 */
@Service
public class ProvisionalPaymentVerificationService implements PaymentVerificationPort {

    private static final String PROVIDER_NAME = "PROVISIONAL_PAYMENT_GATEWAY";

    @Override
    public VerificationResult verifyPrepaidTransaction(
            String externalTransactionRef,
            BigDecimal expectedAmount,
            String currency) {

        if (externalTransactionRef == null || externalTransactionRef.isBlank()) {
            return new VerificationResult(
                    false,
                    PROVIDER_NAME,
                    null,
                    "No payment transaction reference provided; payment remains PENDING_PAYMENT"
            );
        }

        String trimmed = externalTransactionRef.trim();
        // Only explicitly verified tokens are accepted as confirmed payments
        if (trimmed.startsWith("PAY-VERIFIED-") || trimmed.startsWith("TXN-VERIFIED-")) {
            return new VerificationResult(
                    true,
                    PROVIDER_NAME,
                    trimmed,
                    "Verified prepaid transaction " + trimmed + " for " + currency + " " + expectedAmount
            );
        }

        return new VerificationResult(
                false,
                PROVIDER_NAME,
                trimmed,
                "Payment transaction reference '" + trimmed + "' could not be verified by the payment gateway"
        );
    }
}


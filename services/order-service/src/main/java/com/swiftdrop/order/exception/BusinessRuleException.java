package com.swiftdrop.order.exception;

/**
 * A request was well-formed but violates a business rule (for example, the pickup location is
 * outside every service area). Mapped to HTTP 422. The message is shown to the caller, so it must
 * never contain sensitive data.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}

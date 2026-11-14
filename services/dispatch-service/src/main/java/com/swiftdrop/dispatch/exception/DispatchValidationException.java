package com.swiftdrop.dispatch.exception;

public class DispatchValidationException extends RuntimeException {
    private final String errorCode;

    public DispatchValidationException(String message) {
        super(message);
        this.errorCode = "DISPATCH_RULE_VIOLATION";
    }

    public DispatchValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}

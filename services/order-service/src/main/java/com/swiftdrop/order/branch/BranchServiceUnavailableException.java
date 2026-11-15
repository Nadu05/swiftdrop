package com.swiftdrop.order.branch;

/**
 * The Organization service could not say which branch handles a pickup (it is down, slow or returned an
 * unexpected answer). Mapped to HTTP 503: the customer can simply try again; nothing was created.
 */
public class BranchServiceUnavailableException extends RuntimeException {

    public BranchServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public BranchServiceUnavailableException(String message) {
        super(message);
    }
}

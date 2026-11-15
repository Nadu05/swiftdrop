package com.swiftdrop.dispatch.exception;

import org.springframework.http.HttpStatus;

/**
 * Courier portal error with a safe, user-facing message and the HTTP status to return.
 * Handled by {@link CourierPortalExceptionHandler}.
 */
public class CourierPortalException extends RuntimeException {

    private final HttpStatus status;

    public CourierPortalException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    /** 401: no usable courier identity on the request. */
    public static CourierPortalException unauthenticated(String message) {
        return new CourierPortalException(HttpStatus.UNAUTHORIZED, message);
    }

    /** 403: the caller is signed in but is not a courier. */
    public static CourierPortalException forbidden(String message) {
        return new CourierPortalException(HttpStatus.FORBIDDEN, message);
    }

    /** 404: the courier or job does not exist for this caller (other couriers' jobs are hidden as 404). */
    public static CourierPortalException notFound(String message) {
        return new CourierPortalException(HttpStatus.NOT_FOUND, message);
    }

    /** 409: the action is not allowed in the job's or courier's current state. */
    public static CourierPortalException conflict(String message) {
        return new CourierPortalException(HttpStatus.CONFLICT, message);
    }

    /** 400: input passed bean validation but breaks a business rule. */
    public static CourierPortalException badRequest(String message) {
        return new CourierPortalException(HttpStatus.BAD_REQUEST, message);
    }
}

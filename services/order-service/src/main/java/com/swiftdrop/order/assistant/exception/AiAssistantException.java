package com.swiftdrop.order.assistant.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception representing safe, client-facing AI assistant failures (e.g., 429 rate limit or 503 unavailable).
 */
public class AiAssistantException extends RuntimeException {

    private final HttpStatus status;

    public AiAssistantException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public AiAssistantException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

package com.swiftdrop.order.exception;

/**
 * The fee the customer confirmed (the quote they saw) no longer matches the fee calculated now, for example
 * because the tariff changed in between. Mapped to HTTP 409 so the client can show the new quote.
 */
public class PriceChangedException extends RuntimeException {

    public PriceChangedException() {
        super("The delivery fee has changed since your quote. Please review the new fee and confirm again.");
    }
}

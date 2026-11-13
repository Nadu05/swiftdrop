package com.swiftdrop.organization.dto;

/**
 * Shared regular expressions for merchant request validation.
 */
final class MerchantValidationPatterns {

    /** Letters/digits first, then letters, digits, spaces, '/', '-', '.' (e.g. PV-00214890, W/KD/1892). */
    static final String REGISTRATION_NUMBER = "^[A-Za-z0-9][A-Za-z0-9 /.\\-]*$";

    /** Optional leading '+', then 7–20 digits, spaces, hyphens or parentheses. */
    static final String PHONE = "^\\+?[0-9\\s\\-()]{7,20}$";

    private MerchantValidationPatterns() {}
}


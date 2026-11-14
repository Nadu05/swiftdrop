package com.swiftdrop.organization.dto;

/**
 * Shared regular expressions for request validation across Organization Service DTOs.
 */
public final class MerchantValidationPatterns {

    /** Letters/digits first, then letters, digits, spaces, '/', '-', '.' (e.g. PV-00214890, W/KD/1892). */
    public static final String REGISTRATION_NUMBER = "^[A-Za-z0-9][A-Za-z0-9 /.\\-]*$";

    /** Branch code: letters/digits first, then letters, digits, hyphens or underscores (e.g. BR-COL-001). */
    public static final String BRANCH_CODE = "^\\s*[A-Za-z0-9][A-Za-z0-9_-]*\\s*$";

    /** Optional leading '+', then 7–20 digits, spaces, hyphens or parentheses. */
    public static final String PHONE = "^\\+?[0-9\\s\\-()]{7,20}$";

    /** Rejects empty or whitespace-only strings when a PATCH field is explicitly provided. */
    public static final String NON_BLANK = ".*\\S.*";

    private MerchantValidationPatterns() {}
}


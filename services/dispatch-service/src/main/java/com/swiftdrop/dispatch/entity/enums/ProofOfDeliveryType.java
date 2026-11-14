package com.swiftdrop.dispatch.entity.enums;

public enum ProofOfDeliveryType {
    SIGNATURE,
    PHOTO,
    OTP;

    public static ProofOfDeliveryType fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return SIGNATURE;
        }
        String normalized = raw.trim().toUpperCase();
        for (ProofOfDeliveryType t : values()) {
            if (t.name().equals(normalized)) {
                return t;
            }
        }
        throw new IllegalArgumentException("Unsupported proof of delivery type: " + raw);
    }
}


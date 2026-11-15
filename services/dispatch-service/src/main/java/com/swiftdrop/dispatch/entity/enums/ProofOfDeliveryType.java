package com.swiftdrop.dispatch.entity.enums;

/**
 * How the courier proved a delivery. Only a reference is stored (OTP code, signature id or photo
 * reference), never the media itself. Must match {@code chk_courier_deliveries_pod_type} (V3).
 */
public enum ProofOfDeliveryType {
    OTP,
    SIGNATURE,
    PHOTO
}

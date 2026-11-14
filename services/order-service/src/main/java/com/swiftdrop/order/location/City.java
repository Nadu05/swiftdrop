package com.swiftdrop.order.location;

/**
 * A supported pickup/delivery town. The {@code district} acts as the pricing zone.
 *
 * @param code      stable identifier clients send (upper case, e.g. {@code KANDY})
 * @param name      display name
 * @param district  zone used for the inter-zone surcharge
 * @param latitude  town-centre latitude in decimal degrees
 * @param longitude town-centre longitude in decimal degrees
 */
public record City(String code, String name, String district, double latitude, double longitude) {
}

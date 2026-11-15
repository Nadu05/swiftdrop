package com.swiftdrop.order.dto;

import com.swiftdrop.order.location.City;
import com.swiftdrop.order.location.Provinces;

/**
 * A selectable town for the booking form, with its district and province so the form can offer
 * Province -> District -> Town. Coordinates are internal and deliberately not exposed.
 */
public record CityResponse(String code, String name, String district, String province) {

    public static CityResponse from(City city) {
        return new CityResponse(city.code(), city.name(), city.district(), Provinces.of(city));
    }
}

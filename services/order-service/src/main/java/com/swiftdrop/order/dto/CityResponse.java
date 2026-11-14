package com.swiftdrop.order.dto;

import com.swiftdrop.order.location.City;

/** A selectable town for the booking form. Coordinates are internal and deliberately not exposed. */
public record CityResponse(String code, String name, String district) {

    public static CityResponse from(City city) {
        return new CityResponse(city.code(), city.name(), city.district());
    }
}

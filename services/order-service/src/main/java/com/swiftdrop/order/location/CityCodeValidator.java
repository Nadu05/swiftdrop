package com.swiftdrop.order.location;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/** Spring creates this validator, so it can use the {@link CityDirectory} bean. */
public class CityCodeValidator implements ConstraintValidator<ValidCity, String> {

    private final CityDirectory cities;

    public CityCodeValidator(CityDirectory cities) {
        this.cities = cities;
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || cities.find(value).isPresent();
    }
}

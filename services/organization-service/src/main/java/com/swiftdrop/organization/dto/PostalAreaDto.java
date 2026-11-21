package com.swiftdrop.organization.dto;

public record PostalAreaDto(
        Long id,
        String postalCode,
        String areaName,
        Long provinceId,
        String provinceName,
        Long districtId,
        String districtName,
        Long dsDivisionId,
        String dsDivisionName,
        Double latitude,
        Double longitude,
        boolean isActive
) {}

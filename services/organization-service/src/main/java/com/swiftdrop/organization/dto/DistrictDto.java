package com.swiftdrop.organization.dto;

public record DistrictDto(
        Long id,
        String code,
        String name,
        Long provinceId,
        String provinceName,
        Double latitude,
        Double longitude
) {}

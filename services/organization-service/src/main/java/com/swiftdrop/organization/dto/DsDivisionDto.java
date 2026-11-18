package com.swiftdrop.organization.dto;

public record DsDivisionDto(
        Long id,
        String code,
        String name,
        Long districtId,
        String districtName,
        Double latitude,
        Double longitude
) {}

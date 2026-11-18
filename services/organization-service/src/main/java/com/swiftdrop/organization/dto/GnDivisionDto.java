package com.swiftdrop.organization.dto;

public record GnDivisionDto(
        Long id,
        String code,
        String name,
        Long dsDivisionId,
        String dsDivisionName,
        String postalCode,
        Long postalAreaId,
        Double latitude,
        Double longitude
) {}

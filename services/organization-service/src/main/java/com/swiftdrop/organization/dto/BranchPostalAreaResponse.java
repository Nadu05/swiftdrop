package com.swiftdrop.organization.dto;

import java.time.LocalDateTime;

public record BranchPostalAreaResponse(
        Long id,
        Long postalAreaId,
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
        boolean isActive,
        LocalDateTime assignedAt,
        String assignedBy
) {}

package com.swiftdrop.organization.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BranchPostalAreasUpdateRequest(
        @NotNull(message = "postalAreaIds must not be null")
        List<Long> postalAreaIds
) {}

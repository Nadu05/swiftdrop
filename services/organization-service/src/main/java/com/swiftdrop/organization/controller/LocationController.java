package com.swiftdrop.organization.controller;

import com.swiftdrop.organization.dto.DistrictDto;
import com.swiftdrop.organization.dto.DsDivisionDto;
import com.swiftdrop.organization.dto.GnDivisionDto;
import com.swiftdrop.organization.dto.PostalAreaDto;
import com.swiftdrop.organization.dto.ProvinceDto;
import com.swiftdrop.organization.service.LocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for Sri Lankan Administrative Divisions and Postal Area queries.
 *
 * <p>Dual-mapped to support both direct service access ({@code /api/v1/locations})
 * and API Gateway routed access ({@code /locations}) where the Gateway strips
 * {@code /api/v1/organization} via {@code StripPrefix=3}.</p>
 */
@RestController
@RequestMapping({"/api/v1/locations", "/locations"})
@Tag(name = "Locations", description = "Sri Lankan administrative divisions and postal area reference queries")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/provinces")
    @Operation(summary = "List all provinces")
    public ResponseEntity<List<ProvinceDto>> getProvinces() {
        return ResponseEntity.ok(locationService.getProvinces());
    }

    @GetMapping("/districts")
    @Operation(summary = "List districts, optionally filtered by provinceId")
    public ResponseEntity<List<DistrictDto>> getDistricts(
            @RequestParam(required = false) Long provinceId
    ) {
        return ResponseEntity.ok(locationService.getDistricts(provinceId));
    }

    @GetMapping("/ds-divisions")
    @Operation(summary = "List DS divisions, optionally filtered by districtId")
    public ResponseEntity<List<DsDivisionDto>> getDsDivisions(
            @RequestParam(required = false) Long districtId
    ) {
        return ResponseEntity.ok(locationService.getDsDivisions(districtId));
    }

    @GetMapping("/gn-divisions")
    @Operation(summary = "List GN divisions, optionally filtered by dsDivisionId")
    public ResponseEntity<List<GnDivisionDto>> getGnDivisions(
            @RequestParam(required = false) Long dsDivisionId
    ) {
        return ResponseEntity.ok(locationService.getGnDivisions(dsDivisionId));
    }

    @GetMapping("/postal-areas")
    @Operation(summary = "Search and filter active postal areas")
    public ResponseEntity<List<PostalAreaDto>> searchPostalAreas(
            @RequestParam(required = false) Long provinceId,
            @RequestParam(required = false) Long districtId,
            @RequestParam(required = false) Long dsDivisionId,
            @RequestParam(required = false) Long gnDivisionId,
            @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(locationService.searchPostalAreas(
                provinceId, districtId, dsDivisionId, gnDivisionId, search
        ));
    }
}

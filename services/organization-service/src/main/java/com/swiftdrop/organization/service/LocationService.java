package com.swiftdrop.organization.service;

import com.swiftdrop.organization.dto.DistrictDto;
import com.swiftdrop.organization.dto.DsDivisionDto;
import com.swiftdrop.organization.dto.GnDivisionDto;
import com.swiftdrop.organization.dto.PostalAreaDto;
import com.swiftdrop.organization.dto.ProvinceDto;
import com.swiftdrop.organization.entity.District;
import com.swiftdrop.organization.entity.DsDivision;
import com.swiftdrop.organization.entity.GnDivision;
import com.swiftdrop.organization.entity.PostalArea;
import com.swiftdrop.organization.entity.Province;
import com.swiftdrop.organization.repository.DistrictRepository;
import com.swiftdrop.organization.repository.DsDivisionRepository;
import com.swiftdrop.organization.repository.GnDivisionRepository;
import com.swiftdrop.organization.repository.PostalAreaRepository;
import com.swiftdrop.organization.repository.ProvinceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Read-only query service for Sri Lankan Administrative Divisions and Postal Areas.
 */
@Service
@Transactional(readOnly = true)
public class LocationService {

    private final ProvinceRepository provinceRepository;
    private final DistrictRepository districtRepository;
    private final DsDivisionRepository dsDivisionRepository;
    private final GnDivisionRepository gnDivisionRepository;
    private final PostalAreaRepository postalAreaRepository;

    public LocationService(
            ProvinceRepository provinceRepository,
            DistrictRepository districtRepository,
            DsDivisionRepository dsDivisionRepository,
            GnDivisionRepository gnDivisionRepository,
            PostalAreaRepository postalAreaRepository
    ) {
        this.provinceRepository = provinceRepository;
        this.districtRepository = districtRepository;
        this.dsDivisionRepository = dsDivisionRepository;
        this.gnDivisionRepository = gnDivisionRepository;
        this.postalAreaRepository = postalAreaRepository;
    }

    public List<ProvinceDto> getProvinces() {
        return provinceRepository.findAllByOrderByNameAsc().stream()
                .map(this::toProvinceDto)
                .toList();
    }

    public List<DistrictDto> getDistricts(Long provinceId) {
        List<District> districts = provinceId != null
                ? districtRepository.findByProvinceIdOrderByNameAsc(provinceId)
                : districtRepository.findAllByOrderByNameAsc();
        return districts.stream()
                .map(this::toDistrictDto)
                .toList();
    }

    public List<DsDivisionDto> getDsDivisions(Long districtId) {
        List<DsDivision> divisions = districtId != null
                ? dsDivisionRepository.findByDistrictIdOrderByNameAsc(districtId)
                : dsDivisionRepository.findAllByOrderByNameAsc();
        return divisions.stream()
                .map(this::toDsDivisionDto)
                .toList();
    }

    public List<GnDivisionDto> getGnDivisions(Long dsDivisionId) {
        List<GnDivision> divisions = dsDivisionId != null
                ? gnDivisionRepository.findByDsDivisionIdOrderByNameAsc(dsDivisionId)
                : gnDivisionRepository.findAllByOrderByNameAsc();
        return divisions.stream()
                .map(this::toGnDivisionDto)
                .toList();
    }

    public List<PostalAreaDto> searchPostalAreas(
            Long provinceId,
            Long districtId,
            Long dsDivisionId,
            Long gnDivisionId,
            String search
    ) {
        Long effectiveDistrictId = districtId;
        Long effectiveDsDivisionId = dsDivisionId;
        String gnPostalCode = null;
        Long fallbackDistrictId = null;

        if (gnDivisionId != null) {
            GnDivision gn = gnDivisionRepository.findById(gnDivisionId).orElse(null);
            if (gn != null) {
                if (gn.getPostalCode() != null && !gn.getPostalCode().isBlank()) {
                    gnPostalCode = gn.getPostalCode();
                } else if (gn.getDsDivision() != null) {
                    if (effectiveDsDivisionId == null) {
                        effectiveDsDivisionId = gn.getDsDivision().getId();
                    }
                    if (gn.getDsDivision().getDistrict() != null) {
                        fallbackDistrictId = gn.getDsDivision().getDistrict().getId();
                    }
                }
            }
        }

        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        List<PostalArea> results = postalAreaRepository.searchActivePostalAreas(
                provinceId,
                effectiveDistrictId,
                effectiveDsDivisionId,
                gnPostalCode,
                normalizedSearch
        );

        // Fall back to District postal areas when GN-level and DS-level mappings are absent
        if (results.isEmpty() && gnDivisionId != null && gnPostalCode == null && fallbackDistrictId != null) {
            results = postalAreaRepository.searchActivePostalAreas(
                    provinceId,
                    effectiveDistrictId != null ? effectiveDistrictId : fallbackDistrictId,
                    null,
                    null,
                    normalizedSearch
            );
        }

        return results.stream()
                .map(this::toPostalAreaDto)
                .toList();
    }

    private ProvinceDto toProvinceDto(Province p) {
        return new ProvinceDto(p.getId(), p.getCode(), p.getName(), p.getLatitude(), p.getLongitude());
    }

    private DistrictDto toDistrictDto(District d) {
        return new DistrictDto(
                d.getId(),
                d.getCode(),
                d.getName(),
                d.getProvince().getId(),
                d.getProvince().getName(),
                d.getLatitude(),
                d.getLongitude()
        );
    }

    private DsDivisionDto toDsDivisionDto(DsDivision ds) {
        return new DsDivisionDto(
                ds.getId(),
                ds.getCode(),
                ds.getName(),
                ds.getDistrict().getId(),
                ds.getDistrict().getName(),
                ds.getLatitude(),
                ds.getLongitude()
        );
    }

    private GnDivisionDto toGnDivisionDto(GnDivision gn) {
        return new GnDivisionDto(
                gn.getId(),
                gn.getCode(),
                gn.getName(),
                gn.getDsDivision().getId(),
                gn.getDsDivision().getName(),
                gn.getPostalCode(),
                gn.getPostalArea() != null ? gn.getPostalArea().getId() : null,
                gn.getLatitude(),
                gn.getLongitude()
        );
    }

    private PostalAreaDto toPostalAreaDto(PostalArea pa) {
        return new PostalAreaDto(
                pa.getId(),
                pa.getPostalCode(),
                pa.getAreaName(),
                pa.getProvince().getId(),
                pa.getProvince().getName(),
                pa.getDistrict().getId(),
                pa.getDistrict().getName(),
                pa.getDsDivision() != null ? pa.getDsDivision().getId() : null,
                pa.getDsDivision() != null ? pa.getDsDivision().getName() : null,
                pa.getLatitude(),
                pa.getLongitude(),
                pa.isActive()
        );
    }
}

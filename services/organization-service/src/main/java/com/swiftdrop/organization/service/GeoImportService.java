package com.swiftdrop.organization.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Idempotently imports a curated Sri Lankan geographical reference bundle
 * into provinces, districts, ds_divisions, postal_areas, and gn_divisions
 * without modifying any branch or branch coverage tables.
 */
@Service
public class GeoImportService {

    private static final Logger log = LoggerFactory.getLogger(GeoImportService.class);

    private final ObjectMapper objectMapper;
    private final ProvinceRepository provinceRepository;
    private final DistrictRepository districtRepository;
    private final DsDivisionRepository dsDivisionRepository;
    private final PostalAreaRepository postalAreaRepository;
    private final GnDivisionRepository gnDivisionRepository;

    public GeoImportService(
            ObjectMapper objectMapper,
            ProvinceRepository provinceRepository,
            DistrictRepository districtRepository,
            DsDivisionRepository dsDivisionRepository,
            PostalAreaRepository postalAreaRepository,
            GnDivisionRepository gnDivisionRepository
    ) {
        this.objectMapper = objectMapper;
        this.provinceRepository = provinceRepository;
        this.districtRepository = districtRepository;
        this.dsDivisionRepository = dsDivisionRepository;
        this.postalAreaRepository = postalAreaRepository;
        this.gnDivisionRepository = gnDivisionRepository;
    }

    @Transactional
    public GeoImportSummary importBundleIfNeeded(InputStream bundleStream, boolean force) throws IOException {
        GeoBundlePayload payload = objectMapper.readValue(bundleStream, GeoBundlePayload.class);
        String defaultVersion = payload.importVersion != null ? payload.importVersion : "unknown";

        if (!force
                && postalAreaRepository.existsByImportVersion(defaultVersion)
                && dsDivisionRepository.count() > 0
                && gnDivisionRepository.count() > 0) {
            log.info("Geo-import version={} is already seeded; skipping startup import (set app.geo-import.force=true to re-import)",
                    defaultVersion);
            return new GeoImportSummary(
                    defaultVersion,
                    (int) provinceRepository.count(),
                    (int) districtRepository.count(),
                    (int) dsDivisionRepository.count(),
                    (int) postalAreaRepository.count(),
                    (int) gnDivisionRepository.count()
            );
        }

        return importPayload(payload, defaultVersion);
    }

    @Transactional
    public GeoImportSummary importBundle(InputStream bundleStream) throws IOException {
        GeoBundlePayload payload = objectMapper.readValue(bundleStream, GeoBundlePayload.class);
        String defaultVersion = payload.importVersion != null ? payload.importVersion : "unknown";
        return importPayload(payload, defaultVersion);
    }

    private GeoImportSummary importPayload(GeoBundlePayload payload, String defaultVersion) {
        Map<String, Province> provinceMap = upsertProvinces(payload.provinces);
        Map<String, District> districtMap = upsertDistricts(payload.districts, provinceMap);
        Map<String, DsDivision> dsMap = upsertDsDivisions(payload.dsDivisions, districtMap);
        Map<String, PostalArea> postalAreaMap = upsertPostalAreas(
                payload.postalAreas, provinceMap, districtMap, dsMap, defaultVersion
        );
        int gnCount = upsertGnDivisions(payload.gnDivisions, dsMap, postalAreaMap);

        GeoImportSummary summary = new GeoImportSummary(
                defaultVersion,
                provinceMap.size(),
                districtMap.size(),
                dsMap.size(),
                postalAreaMap.size(),
                gnCount
        );
        log.info("Completed geo-import version={}: provinces={}, districts={}, dsDivisions={}, postalAreas={}, gnDivisions={}",
                summary.importVersion(), summary.provinces(), summary.districts(),
                summary.dsDivisions(), summary.postalAreas(), summary.gnDivisions());
        return summary;
    }

    private Map<String, Province> upsertProvinces(List<ProvinceRecord> records) {
        Map<String, Province> existing = provinceRepository.findAll().stream()
                .collect(Collectors.toMap(Province::getCode, Function.identity(), (a, b) -> a));
        Map<String, Province> result = new HashMap<>(existing);
        if (records == null || records.isEmpty()) {
            return result;
        }
        List<Province> toSave = new ArrayList<>(records.size());
        for (ProvinceRecord rec : records) {
            Province entity = existing.getOrDefault(rec.code, new Province());
            entity.setCode(rec.code);
            entity.setName(rec.name);
            entity.setLatitude(rec.latitude);
            entity.setLongitude(rec.longitude);
            toSave.add(entity);
        }
        for (Province saved : provinceRepository.saveAll(toSave)) {
            result.put(saved.getCode(), saved);
        }
        return result;
    }

    private Map<String, District> upsertDistricts(
            List<DistrictRecord> records,
            Map<String, Province> provinceMap
    ) {
        Map<String, District> existing = districtRepository.findAll().stream()
                .collect(Collectors.toMap(District::getCode, Function.identity(), (a, b) -> a));
        Map<String, District> result = new HashMap<>(existing);
        if (records == null || records.isEmpty()) {
            return result;
        }
        List<District> toSave = new ArrayList<>(records.size());
        for (DistrictRecord rec : records) {
            Province province = resolveProvince(rec.provinceCode, provinceMap);
            District entity = existing.getOrDefault(rec.code, new District());
            entity.setCode(rec.code);
            entity.setProvince(province);
            entity.setName(rec.name);
            entity.setLatitude(rec.latitude);
            entity.setLongitude(rec.longitude);
            toSave.add(entity);
        }
        for (District saved : districtRepository.saveAll(toSave)) {
            result.put(saved.getCode(), saved);
        }
        return result;
    }

    private Map<String, DsDivision> upsertDsDivisions(
            List<DsDivisionRecord> records,
            Map<String, District> districtMap
    ) {
        Map<String, DsDivision> existing = dsDivisionRepository.findAll().stream()
                .collect(Collectors.toMap(DsDivision::getCode, Function.identity(), (a, b) -> a));
        Map<String, DsDivision> result = new HashMap<>(existing);
        if (records == null || records.isEmpty()) {
            return result;
        }
        List<DsDivision> toSave = new ArrayList<>(records.size());
        for (DsDivisionRecord rec : records) {
            District district = resolveDistrict(rec.districtCode, districtMap);
            DsDivision entity = existing.getOrDefault(rec.code, new DsDivision());
            entity.setCode(rec.code);
            entity.setDistrict(district);
            entity.setName(rec.name);
            entity.setLatitude(rec.latitude);
            entity.setLongitude(rec.longitude);
            toSave.add(entity);
        }
        for (DsDivision saved : dsDivisionRepository.saveAll(toSave)) {
            result.put(saved.getCode(), saved);
        }
        return result;
    }

    private Map<String, PostalArea> upsertPostalAreas(
            List<PostalAreaRecord> records,
            Map<String, Province> provinceMap,
            Map<String, District> districtMap,
            Map<String, DsDivision> dsMap,
            String defaultVersion
    ) {
        Map<String, PostalArea> existing = postalAreaRepository.findAll().stream()
                .collect(Collectors.toMap(PostalArea::getPostalCode, Function.identity(), (a, b) -> a));
        Map<String, PostalArea> result = new HashMap<>(existing);
        if (records == null || records.isEmpty()) {
            return result;
        }
        List<PostalArea> toSave = new ArrayList<>(records.size());
        for (PostalAreaRecord rec : records) {
            Province province = resolveProvince(rec.provinceCode, provinceMap);
            District district = resolveDistrict(rec.districtCode, districtMap);
            DsDivision dsDivision = rec.dsDivisionCode != null
                    ? resolveDsDivision(rec.dsDivisionCode, dsMap)
                    : null;

            PostalArea entity = existing.getOrDefault(rec.postalCode, new PostalArea());
            entity.setPostalCode(rec.postalCode);
            entity.setAreaName(rec.areaName);
            entity.setProvince(province);
            entity.setDistrict(district);
            entity.setDsDivision(dsDivision);
            entity.setLatitude(rec.latitude);
            entity.setLongitude(rec.longitude);
            entity.setActive(rec.isActive != null ? rec.isActive : true);
            entity.setSourceName(rec.sourceName != null ? rec.sourceName : "slwdc/Postal-Codes");
            entity.setSourceReference(rec.sourceReference != null ? rec.sourceReference : "SriLankaPost");
            entity.setImportVersion(rec.importVersion != null ? rec.importVersion : defaultVersion);
            toSave.add(entity);
        }
        for (PostalArea saved : postalAreaRepository.saveAll(toSave)) {
            result.put(saved.getPostalCode(), saved);
        }
        return result;
    }

    private int upsertGnDivisions(
            List<GnDivisionRecord> records,
            Map<String, DsDivision> dsMap,
            Map<String, PostalArea> postalAreaMap
    ) {
        if (records == null || records.isEmpty()) {
            return 0;
        }
        Map<String, GnDivision> existing = gnDivisionRepository.findAll().stream()
                .collect(Collectors.toMap(GnDivision::getCode, Function.identity(), (a, b) -> a));
        List<GnDivision> toSave = new ArrayList<>(records.size());
        for (GnDivisionRecord rec : records) {
            DsDivision dsDivision = resolveDsDivision(rec.dsDivisionCode, dsMap);
            PostalArea postalArea = null;
            if (rec.postalCode != null && !rec.postalCode.isBlank()) {
                postalArea = postalAreaMap.get(rec.postalCode);
            }
            GnDivision entity = existing.getOrDefault(rec.code, new GnDivision());
            entity.setCode(rec.code);
            entity.setDsDivision(dsDivision);
            entity.setName(rec.name);
            entity.setPostalCode(rec.postalCode);
            entity.setPostalArea(postalArea);
            entity.setLatitude(rec.latitude);
            entity.setLongitude(rec.longitude);
            toSave.add(entity);
        }
        gnDivisionRepository.saveAll(toSave);
        return toSave.size();
    }

    private Province resolveProvince(String code, Map<String, Province> cache) {
        return cache.computeIfAbsent(code, c -> provinceRepository.findByCode(c)
                .orElseThrow(() -> new IllegalStateException("Unknown province code in geo bundle: " + c)));
    }

    private District resolveDistrict(String code, Map<String, District> cache) {
        return cache.computeIfAbsent(code, c -> districtRepository.findByCode(c)
                .orElseThrow(() -> new IllegalStateException("Unknown district code in geo bundle: " + c)));
    }

    private DsDivision resolveDsDivision(String code, Map<String, DsDivision> cache) {
        return cache.computeIfAbsent(code, c -> dsDivisionRepository.findByCode(c)
                .orElseThrow(() -> new IllegalStateException("Unknown DS division code in geo bundle: " + c)));
    }

    public record GeoImportSummary(
            String importVersion,
            int provinces,
            int districts,
            int dsDivisions,
            int postalAreas,
            int gnDivisions
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GeoBundlePayload {
        @JsonProperty("import_version")
        public String importVersion;
        public List<ProvinceRecord> provinces;
        public List<DistrictRecord> districts;
        @JsonProperty("ds_divisions")
        public List<DsDivisionRecord> dsDivisions;
        @JsonProperty("postal_areas")
        public List<PostalAreaRecord> postalAreas;
        @JsonProperty("gn_divisions")
        public List<GnDivisionRecord> gnDivisions;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class ProvinceRecord {
        public String code;
        public String name;
        public Double latitude;
        public Double longitude;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class DistrictRecord {
        public String code;
        @JsonProperty("province_code")
        public String provinceCode;
        public String name;
        public Double latitude;
        public Double longitude;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class DsDivisionRecord {
        public String code;
        @JsonProperty("district_code")
        public String districtCode;
        public String name;
        public Double latitude;
        public Double longitude;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class PostalAreaRecord {
        @JsonProperty("postal_code")
        public String postalCode;
        @JsonProperty("area_name")
        public String areaName;
        @JsonProperty("province_code")
        public String provinceCode;
        @JsonProperty("district_code")
        public String districtCode;
        @JsonProperty("ds_division_code")
        public String dsDivisionCode;
        public Double latitude;
        public Double longitude;
        @JsonProperty("is_active")
        public Boolean isActive;
        @JsonProperty("source_name")
        public String sourceName;
        @JsonProperty("source_reference")
        public String sourceReference;
        @JsonProperty("import_version")
        public String importVersion;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GnDivisionRecord {
        public String code;
        @JsonProperty("ds_division_code")
        public String dsDivisionCode;
        public String name;
        @JsonProperty("postal_code")
        public String postalCode;
        public Double latitude;
        public Double longitude;
    }
}

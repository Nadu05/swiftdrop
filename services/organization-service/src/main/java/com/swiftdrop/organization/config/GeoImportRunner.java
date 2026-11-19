package com.swiftdrop.organization.config;

import com.swiftdrop.organization.repository.ProvinceRepository;
import com.swiftdrop.organization.service.GeoImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;

/**
 * Spring Boot runner activated on non-test profiles ({@code !test})
 * to automatically and idempotently seed the curated Sri Lankan geographical dataset bundle on first boot.
 */
@Component
@Profile("!test")
public class GeoImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(GeoImportRunner.class);

    private final GeoImportService geoImportService;
    private final ProvinceRepository provinceRepository;
    private final ResourceLoader resourceLoader;
    private final String bundleLocation;
    private final boolean forceImport;

    public GeoImportRunner(
            GeoImportService geoImportService,
            ProvinceRepository provinceRepository,
            ResourceLoader resourceLoader,
            @Value("${app.geo-import.bundle-path:}") String bundleLocation,
            @Value("${app.geo-import.force:false}") boolean forceImport
    ) {
        this.geoImportService = geoImportService;
        this.provinceRepository = provinceRepository;
        this.resourceLoader = resourceLoader;
        this.bundleLocation = bundleLocation;
        this.forceImport = forceImport;
    }

    @Override
    public void run(String... args) throws Exception {
        Resource resource = resolveBundleResource();
        log.info("Running geo-import from bundle: {}", resource.getDescription());
        try (InputStream stream = resource.getInputStream()) {
            geoImportService.importBundle(stream);
        }
    }

    private Resource resolveBundleResource() {
        if (bundleLocation != null && !bundleLocation.isBlank()) {
            Resource explicit = resourceLoader.getResource(bundleLocation);
            if (!explicit.exists()) {
                throw new IllegalStateException("Geo-import bundle not found at: " + bundleLocation);
            }
            return explicit;
        }
        String[] defaultCandidates = {
                "file:data/geo/curated/sri-lanka-geo-bundle.json",
                "file:../../data/geo/curated/sri-lanka-geo-bundle.json"
        };
        for (String candidate : defaultCandidates) {
            Resource res = resourceLoader.getResource(candidate);
            if (res.exists()) {
                return res;
            }
        }
        throw new IllegalStateException(
                "Geo-import bundle not found in default locations; set app.geo-import.bundle-path");
    }
}

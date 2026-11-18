package com.swiftdrop.organization.config;

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
 * Spring Boot runner activated with {@code --spring.profiles.active=geo-import}
 * to idempotently import the curated Sri Lankan geographical dataset bundle.
 */
@Component
@Profile("geo-import")
public class GeoImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(GeoImportRunner.class);

    private final GeoImportService geoImportService;
    private final ResourceLoader resourceLoader;
    private final String bundleLocation;

    public GeoImportRunner(
            GeoImportService geoImportService,
            ResourceLoader resourceLoader,
            @Value("${app.geo-import.bundle-path:}") String bundleLocation
    ) {
        this.geoImportService = geoImportService;
        this.resourceLoader = resourceLoader;
        this.bundleLocation = bundleLocation;
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

package com.swiftdrop.order.location;

import com.swiftdrop.order.exception.BusinessRuleException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The reference list of supported towns, loaded once from {@code locations/cities.csv}.
 *
 * <p>The file is validated at startup (format, duplicate codes, coordinate ranges); a bad file stops the
 * application instead of silently producing wrong fees.
 */
@Component
public class CityDirectory {

    private static final String DEFAULT_RESOURCE = "locations/cities.csv";
    private static final Pattern CODE = Pattern.compile("^[A-Z0-9_]{2,40}$");

    private final Map<String, City> byCode;

    public CityDirectory() {
        this(new ClassPathResource(DEFAULT_RESOURCE));
    }

    CityDirectory(Resource resource) {
        this.byCode = load(resource);
    }

    /** Case-insensitive lookup by code; surrounding spaces are ignored. */
    public Optional<City> find(String code) {
        if (code == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(byCode.get(code.trim().toUpperCase(Locale.ROOT)));
    }

    /** @throws BusinessRuleException (HTTP 422) when the code is not a supported town */
    public City require(String code) {
        return find(code).orElseThrow(() -> new BusinessRuleException("Unsupported city"));
    }

    /** All supported towns, sorted by display name. */
    public List<City> all() {
        return byCode.values().stream().sorted(Comparator.comparing(City::name)).toList();
    }

    private static Map<String, City> load(Resource resource) {
        Map<String, City> cities = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;
            boolean headerSeen = false;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                    continue;
                }
                if (!headerSeen) {
                    headerSeen = true; // first data line is the header
                    continue;
                }
                City city = parse(trimmed, lineNumber);
                if (cities.putIfAbsent(city.code(), city) != null) {
                    throw new IllegalStateException("Duplicate city code '" + city.code() + "' at line " + lineNumber);
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot read the city list", ex);
        }
        if (cities.isEmpty()) {
            throw new IllegalStateException("The city list is empty");
        }
        return Map.copyOf(cities);
    }

    private static City parse(String line, int lineNumber) {
        String[] parts = line.split(",", -1);
        if (parts.length != 5) {
            throw new IllegalStateException("City list line " + lineNumber + " must have 5 columns");
        }
        String code = parts[0].trim();
        String name = parts[1].trim();
        String district = parts[2].trim();
        if (!CODE.matcher(code).matches() || name.isEmpty() || district.isEmpty()) {
            throw new IllegalStateException("City list line " + lineNumber + " has an invalid code, name or district");
        }
        double latitude;
        double longitude;
        try {
            latitude = Double.parseDouble(parts[3].trim());
            longitude = Double.parseDouble(parts[4].trim());
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("City list line " + lineNumber + " has a non-numeric coordinate");
        }
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalStateException("City list line " + lineNumber + " has out-of-range coordinates");
        }
        return new City(code, name, district, latitude, longitude);
    }
}

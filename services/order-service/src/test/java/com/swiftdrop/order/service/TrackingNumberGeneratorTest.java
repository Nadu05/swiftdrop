package com.swiftdrop.order.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class TrackingNumberGeneratorTest {

    private static final Pattern FORMAT = Pattern.compile("^SD-\\d{6}-[A-HJ-NP-Z2-9]{8}$");

    @Test
    @DisplayName("has the SD-yyMMdd-XXXXXXXX format using the current UTC date")
    void format() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-13T10:15:30Z"), ZoneOffset.UTC);
        TrackingNumberGenerator generator = new TrackingNumberGenerator(new SecureRandom(), clock);

        String number = generator.next();

        assertThat(number).matches(FORMAT).startsWith("SD-261113-");
        assertThat(number.length()).isLessThanOrEqualTo(30); // delivery_orders.tracking_number is VARCHAR(30)
    }

    @Test
    @DisplayName("never uses look-alike characters and is not sequential")
    void uniqueAndUnambiguous() {
        TrackingNumberGenerator generator = new TrackingNumberGenerator();
        Set<String> seen = new HashSet<>();

        for (int i = 0; i < 20_000; i++) {
            String number = generator.next();
            assertThat(number).matches(FORMAT);
            assertThat(number.substring(10)).doesNotContainPattern("[01OI]");
            seen.add(number);
        }

        assertThat(seen).hasSize(20_000);
    }
}

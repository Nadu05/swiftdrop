package com.swiftdrop.order.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Produces public tracking numbers such as {@code SD-261113-K7Q2XM4T}.
 *
 * <p>The random part uses {@link SecureRandom} over a 32-character alphabet without look-alike
 * characters (no 0/O, 1/I), giving 32^8 (about 1.1 trillion) values per day, so numbers are not
 * sequential and not practical to guess. Uniqueness is enforced by the caller (existence check)
 * and finally by the database unique constraint.
 */
@Component
public class TrackingNumberGenerator {

    static final String PREFIX = "SD";
    static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    static final int RANDOM_LENGTH = 8;

    private static final DateTimeFormatter DATE_PART = DateTimeFormatter.ofPattern("yyMMdd").withZone(ZoneOffset.UTC);

    private final SecureRandom random;
    private final Clock clock;

    public TrackingNumberGenerator() {
        this(new SecureRandom(), Clock.systemUTC());
    }

    TrackingNumberGenerator(SecureRandom random, Clock clock) {
        this.random = random;
        this.clock = clock;
    }

    public String next() {
        StringBuilder sb = new StringBuilder(PREFIX.length() + 1 + 6 + 1 + RANDOM_LENGTH);
        sb.append(PREFIX).append('-').append(DATE_PART.format(clock.instant())).append('-');
        for (int i = 0; i < RANDOM_LENGTH; i++) {
            sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}

package com.swiftdrop.order.service;

import com.swiftdrop.order.repository.DeliveryOrderRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Generates collision-safe tracking numbers in the canonical format {@code SD-XXXXX}.
 */
@Component
public class TrackingNumberGenerator {

    private static final String PREFIX = "SD-";
    private static final String ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int CODE_LENGTH = 5;
    private static final int MAX_ATTEMPTS = 50;

    private final DeliveryOrderRepository orderRepository;
    private final SecureRandom random = new SecureRandom();

    public TrackingNumberGenerator(DeliveryOrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public String generateUniqueTrackingNumber() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String candidate = generateCandidate(attempt < 25);
            if (!orderRepository.existsByTrackingNumberIgnoreCase(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate a unique tracking number after " + MAX_ATTEMPTS + " attempts");
    }

    private String generateCandidate(boolean digitsOnly) {
        StringBuilder sb = new StringBuilder(PREFIX);
        if (digitsOnly) {
            int num = 10000 + random.nextInt(90000);
            sb.append(num);
        } else {
            for (int i = 0; i < CODE_LENGTH; i++) {
                sb.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
            }
        }
        return sb.toString();
    }
}


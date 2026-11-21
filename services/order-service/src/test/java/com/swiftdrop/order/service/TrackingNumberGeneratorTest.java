package com.swiftdrop.order.service;

import com.swiftdrop.order.repository.DeliveryOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrackingNumberGeneratorTest {

    @Mock
    private DeliveryOrderRepository orderRepository;

    @InjectMocks
    private TrackingNumberGenerator generator;

    @Test
    void generateUniqueTrackingNumber_ReturnsCanonicalSdFormat() {
        when(orderRepository.existsByTrackingNumberIgnoreCase(anyString())).thenReturn(false);

        String trackingNumber = generator.generateUniqueTrackingNumber();

        assertThat(trackingNumber).matches("^SD-[0-9A-Z]{5}$");
        verify(orderRepository, times(1)).existsByTrackingNumberIgnoreCase(trackingNumber);
    }

    @Test
    void generateUniqueTrackingNumber_WhenCollisionOccurs_RetriesUntilUniqueCandidateFound() {
        when(orderRepository.existsByTrackingNumberIgnoreCase(anyString()))
                .thenReturn(true, true, false);

        String trackingNumber = generator.generateUniqueTrackingNumber();

        assertThat(trackingNumber).matches("^SD-[0-9A-Z]{5}$");
        verify(orderRepository, times(3)).existsByTrackingNumberIgnoreCase(anyString());
    }

    @Test
    void generateUniqueTrackingNumber_MultipleInvocations_ProducesDistinctCandidates() {
        when(orderRepository.existsByTrackingNumberIgnoreCase(anyString())).thenReturn(false);

        Set<String> generated = new HashSet<>();
        for (int i = 0; i < 30; i++) {
            generated.add(generator.generateUniqueTrackingNumber());
        }

        assertThat(generated.size()).isGreaterThan(25);
    }

    @Test
    void generateUniqueTrackingNumber_WhenAllAttemptsCollide_ThrowsIllegalStateException() {
        when(orderRepository.existsByTrackingNumberIgnoreCase(anyString())).thenReturn(true);

        assertThatThrownBy(() -> generator.generateUniqueTrackingNumber())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Failed to generate a unique tracking number");

        verify(orderRepository, times(50)).existsByTrackingNumberIgnoreCase(anyString());
    }
}


package com.swiftdrop.organization.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;

import static org.assertj.core.api.Assertions.assertThatNoException;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@EnabledIf("isLocalPostgresAvailable")
class PostalAreaRepositoryPostgresTest {

    @Autowired
    private PostalAreaRepository postalAreaRepository;

    static boolean isLocalPostgresAvailable() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("localhost", 5433), 500);
            return true;
        } catch (IOException ex) {
            return false;
        }
    }

    @Test
    @DisplayName("searchActivePostalAreas executes cleanly on PostgreSQL for all nullable parameter combinations")
    void shouldExecuteCleanlyOnPostgresWithNullableFilters() {
        assertThatNoException().isThrownBy(() -> {
            postalAreaRepository.searchActivePostalAreas(null, null, null, null, null);
            postalAreaRepository.searchActivePostalAreas(1L, null, null, null, null);
            postalAreaRepository.searchActivePostalAreas(null, 1L, null, null, null);
            postalAreaRepository.searchActivePostalAreas(null, null, 1L, null, null);
            postalAreaRepository.searchActivePostalAreas(null, null, null, "00100", null);
            postalAreaRepository.searchActivePostalAreas(null, null, null, null, "fort");
            postalAreaRepository.searchActivePostalAreas(null, null, null, null, "   ");
        });
    }
}

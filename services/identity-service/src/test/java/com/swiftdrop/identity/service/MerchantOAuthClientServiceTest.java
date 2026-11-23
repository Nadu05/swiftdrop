package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.OAuthClientProvisionRequest;
import com.swiftdrop.identity.dto.OAuthClientProvisionedResponse;
import com.swiftdrop.identity.dto.OAuthClientResponse;
import com.swiftdrop.identity.entity.OAuthClient;
import com.swiftdrop.identity.entity.OAuthClientStatus;
import com.swiftdrop.identity.repository.OAuthClientRepository;
import com.swiftdrop.identity.repository.OAuthCredentialHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MerchantOAuthClientServiceTest {

    @Mock
    private OAuthClientRepository clientRepository;

    @Mock
    private OAuthCredentialHistoryRepository historyRepository;

    private PasswordEncoder passwordEncoder;
    private MerchantOAuthClientService service;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);
        service = new MerchantOAuthClientService(
                clientRepository,
                historyRepository,
                passwordEncoder,
                "http://localhost:8080/oauth2/token"
        );
    }

    @Test
    void provisionClient_hashesSecretAndReturnsRawSecretOnce() {
        when(clientRepository.findByMerchantIdIgnoreCaseAndStatus("APP-2026-0812", OAuthClientStatus.ACTIVE))
                .thenReturn(List.of());
        when(clientRepository.existsByClientId(any())).thenReturn(false);
        when(clientRepository.save(any(OAuthClient.class))).thenAnswer(inv -> {
            OAuthClient c = inv.getArgument(0);
            c.setId(1L);
            return c;
        });

        OAuthClientProvisionRequest req = new OAuthClientProvisionRequest();
        req.setMerchantId("APP-2026-0812");
        req.setMerchantName("Ceylon Organic Tea");
        req.setScopes(List.of("merchant:orders:read", "merchant:orders:write"));

        OAuthClientProvisionedResponse res = service.provisionClient(req, "admin@swiftdrop.lk");

        assertNotNull(res.getClientId());
        assertTrue(res.getClientId().startsWith("sd_m_"));
        assertNotNull(res.getClientSecret());
        assertTrue(res.getClientSecret().startsWith("sd_sec_"));
        assertEquals("ACTIVE", res.getStatus());
        assertEquals("http://localhost:8080/oauth2/token", res.getTokenEndpoint());
        verify(historyRepository, times(1)).save(any());
    }

    @Test
    void provisionClient_rejectsUnknownScope() {
        OAuthClientProvisionRequest req = new OAuthClientProvisionRequest();
        req.setMerchantId("APP-2026-0812");
        req.setMerchantName("Ceylon Organic Tea");
        req.setScopes(List.of("admin:super:all"));

        assertThrows(IllegalArgumentException.class, () -> service.provisionClient(req, "admin@swiftdrop.lk"));
    }

    @Test
    void rotateClientSecret_blocksCrossMerchantRotation() {
        OAuthClient merchantAClient = new OAuthClient();
        merchantAClient.setId(5L);
        merchantAClient.setClientId("sd_m_appa_1234");
        merchantAClient.setMerchantId("APP-A");
        merchantAClient.setStatus(OAuthClientStatus.ACTIVE);

        when(clientRepository.findById(5L)).thenReturn(Optional.of(merchantAClient));

        assertThrows(AccessDeniedException.class, () ->
                service.rotateClientSecret(5L, "APP-B", false, "merchantB@test.lk"));
    }

    @Test
    void revokeAllForMerchant_revokesActiveClients() {
        OAuthClient active = new OAuthClient();
        active.setId(7L);
        active.setClientId("sd_m_test_9999");
        active.setMerchantId("APP-SUSP");
        active.setStatus(OAuthClientStatus.ACTIVE);

        when(clientRepository.findByMerchantIdIgnoreCaseAndStatus("APP-SUSP", OAuthClientStatus.ACTIVE))
                .thenReturn(List.of(active));
        when(clientRepository.save(any(OAuthClient.class))).thenAnswer(inv -> inv.getArgument(0));

        int count = service.revokeAllForMerchant("APP-SUSP", "Policy violation", "admin@swiftdrop.lk");
        assertEquals(1, count);
        assertEquals(OAuthClientStatus.REVOKED, active.getStatus());
        assertEquals("Policy violation", active.getRevocationReason());
        verify(historyRepository, times(1)).save(any());
    }
}

package com.swiftdrop.identity.service;

import com.swiftdrop.identity.dto.OAuthClientProvisionRequest;
import com.swiftdrop.identity.dto.OAuthClientProvisionedResponse;
import com.swiftdrop.identity.dto.OAuthClientResponse;
import com.swiftdrop.identity.dto.OAuthCredentialHistoryResponse;
import com.swiftdrop.identity.entity.OAuthClient;
import com.swiftdrop.identity.entity.OAuthClientStatus;
import com.swiftdrop.identity.entity.OAuthCredentialHistory;
import com.swiftdrop.identity.exception.ResourceNotFoundException;
import com.swiftdrop.identity.repository.OAuthClientRepository;
import com.swiftdrop.identity.repository.OAuthCredentialHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Manages OAuth 2.0 Client Credentials for approved SwiftDrop merchants.
 * Client secrets are cryptographically generated, BCrypt-hashed at rest,
 * never logged, and returned only once upon provisioning or rotation.
 */
@Service
@Transactional
public class MerchantOAuthClientService {

    private static final Logger log = LoggerFactory.getLogger(MerchantOAuthClientService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public static final Set<String> ALLOWED_MERCHANT_SCOPES = Set.of(
            "merchant:profile:read",
            "merchant:orders:read",
            "merchant:orders:write",
            "merchant:orders:update",
            "merchant:tracking:read",
            "merchant:webhooks:manage"
    );

    public static final List<String> DEFAULT_MERCHANT_SCOPES = List.of(
            "merchant:profile:read",
            "merchant:orders:read",
            "merchant:orders:write",
            "merchant:orders:update",
            "merchant:tracking:read",
            "merchant:webhooks:manage"
    );

    private final OAuthClientRepository clientRepository;
    private final OAuthCredentialHistoryRepository historyRepository;
    private final PasswordEncoder passwordEncoder;
    private final String publicTokenEndpoint;

    public MerchantOAuthClientService(
            OAuthClientRepository clientRepository,
            OAuthCredentialHistoryRepository historyRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.oauth2.public-token-endpoint:http://localhost:8080/oauth2/token}") String publicTokenEndpoint) {
        this.clientRepository = clientRepository;
        this.historyRepository = historyRepository;
        this.passwordEncoder = passwordEncoder;
        this.publicTokenEndpoint = publicTokenEndpoint;
    }

    public OAuthClientProvisionedResponse provisionClient(
            OAuthClientProvisionRequest request,
            String performedBy) {

        String merchantId = request.getMerchantId().trim();
        String merchantName = request.getMerchantName().trim();
        Set<String> resolvedScopes = validateAndNormalizeScopes(request.getScopes());

        // Mark any previously active clients for this merchant as ROTATED so there is one clean active credential
        List<OAuthClient> activeClients = clientRepository
                .findByMerchantIdIgnoreCaseAndStatus(merchantId, OAuthClientStatus.ACTIVE);
        for (OAuthClient existing : activeClients) {
            existing.setStatus(OAuthClientStatus.ROTATED);
            existing.setRevokedAt(LocalDateTime.now());
            existing.setRevocationReason("Replaced by newly provisioned credential");
            clientRepository.save(existing);
            recordHistory(existing, "ROTATED", performedBy, "Superseded during new credential provisioning");
        }

        String clientId = generateClientId(merchantId);
        String rawSecret = generateClientSecret();

        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setClientSecretHash(passwordEncoder.encode(rawSecret));
        client.setMerchantId(merchantId);
        client.setMerchantName(merchantName);
        client.setStatus(OAuthClientStatus.ACTIVE);
        client.setScopes(resolvedScopes);

        OAuthClient saved = clientRepository.save(client);
        recordHistory(saved, "PROVISIONED", performedBy,
                "Provisioned OAuth 2.0 client with scopes: " + String.join(", ", resolvedScopes));

        log.info("Provisioned OAuth 2.0 client {} for merchant {} by {}", clientId, merchantId, performedBy);
        return toProvisionedResponse(saved, rawSecret);
    }

    public OAuthClientProvisionedResponse rotateClientSecret(
            Long clientPkId,
            String expectedMerchantId,
            boolean isGlobalAdmin,
            String performedBy) {

        OAuthClient existing = clientRepository.findById(clientPkId)
                .orElseThrow(() -> new ResourceNotFoundException("OAuthClient", clientPkId));

        if (!isGlobalAdmin && !existing.getMerchantId().equalsIgnoreCase(expectedMerchantId)) {
            throw new AccessDeniedException("You do not have permission to rotate another merchant's OAuth client");
        }
        if (existing.getStatus() == OAuthClientStatus.REVOKED) {
            throw new IllegalStateException("Cannot rotate a REVOKED OAuth client");
        }

        String newRawSecret = generateClientSecret();
        existing.setClientSecretHash(passwordEncoder.encode(newRawSecret));
        existing.setStatus(OAuthClientStatus.ACTIVE);
        existing.setRevokedAt(null);
        existing.setRevocationReason(null);

        OAuthClient saved = clientRepository.save(existing);
        recordHistory(saved, "SECRET_ROTATED", performedBy, "Client secret rotated");

        log.info("Rotated OAuth 2.0 client secret for {} (merchant={}) by {}",
                saved.getClientId(), saved.getMerchantId(), performedBy);
        return toProvisionedResponse(saved, newRawSecret);
    }

    public OAuthClientResponse revokeClient(
            Long clientPkId,
            String reason,
            String expectedMerchantId,
            boolean isGlobalAdmin,
            String performedBy) {

        OAuthClient existing = clientRepository.findById(clientPkId)
                .orElseThrow(() -> new ResourceNotFoundException("OAuthClient", clientPkId));

        if (!isGlobalAdmin && !existing.getMerchantId().equalsIgnoreCase(expectedMerchantId)) {
            throw new AccessDeniedException("You do not have permission to revoke another merchant's OAuth client");
        }

        existing.setStatus(OAuthClientStatus.REVOKED);
        existing.setRevokedAt(LocalDateTime.now());
        existing.setRevocationReason(reason != null && !reason.isBlank() ? reason.trim() : "Revoked by administrator");

        OAuthClient saved = clientRepository.save(existing);
        recordHistory(saved, "REVOKED", performedBy, saved.getRevocationReason());
        log.info("Revoked OAuth 2.0 client {} by {}", saved.getClientId(), performedBy);
        return toResponse(saved);
    }

    public int revokeAllForMerchant(String merchantId, String reason, String performedBy) {
        List<OAuthClient> activeClients = clientRepository
                .findByMerchantIdIgnoreCaseAndStatus(merchantId.trim(), OAuthClientStatus.ACTIVE);
        String effectiveReason = (reason != null && !reason.isBlank()) ? reason.trim() : "Merchant suspended or terminated";
        for (OAuthClient client : activeClients) {
            client.setStatus(OAuthClientStatus.REVOKED);
            client.setRevokedAt(LocalDateTime.now());
            client.setRevocationReason(effectiveReason);
            clientRepository.save(client);
            recordHistory(client, "REVOKED", performedBy, effectiveReason);
        }
        log.info("Revoked {} active OAuth 2.0 client(s) for merchant {} (reason: {})",
                activeClients.size(), merchantId, effectiveReason);
        return activeClients.size();
    }

    public OAuthClientResponse updateScopes(Long clientPkId, List<String> scopes, String performedBy) {
        OAuthClient existing = clientRepository.findById(clientPkId)
                .orElseThrow(() -> new ResourceNotFoundException("OAuthClient", clientPkId));

        Set<String> resolvedScopes = validateAndNormalizeScopes(scopes);
        existing.setScopes(resolvedScopes);
        OAuthClient saved = clientRepository.save(existing);
        recordHistory(saved, "SCOPES_UPDATED", performedBy,
                "Updated scopes to: " + String.join(", ", resolvedScopes));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<OAuthClientResponse> listByMerchant(String merchantId) {
        if (merchantId == null || merchantId.isBlank()) {
            return List.of();
        }
        return clientRepository.findByMerchantIdIgnoreCaseOrderByCreatedAtDesc(merchantId.trim())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OAuthCredentialHistoryResponse> listHistoryByMerchant(String merchantId) {
        if (merchantId == null || merchantId.isBlank()) {
            return List.of();
        }
        return historyRepository.findByMerchantIdIgnoreCaseOrderByCreatedAtDesc(merchantId.trim())
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    public void recordTokenIssued(String clientId) {
        clientRepository.findByClientId(clientId).ifPresent(client -> {
            client.setLastUsedAt(LocalDateTime.now());
            clientRepository.save(client);
        });
    }

    private Set<String> validateAndNormalizeScopes(List<String> requested) {
        if (requested == null || requested.isEmpty()) {
            return new LinkedHashSet<>(DEFAULT_MERCHANT_SCOPES);
        }
        Set<String> normalized = new LinkedHashSet<>();
        for (String scope : requested) {
            if (scope == null || scope.isBlank()) continue;
            String trimmed = scope.trim();
            if (!ALLOWED_MERCHANT_SCOPES.contains(trimmed)) {
                throw new IllegalArgumentException("Unsupported merchant OAuth scope: '" + trimmed + "'");
            }
            normalized.add(trimmed);
        }
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("At least one valid merchant OAuth scope is required");
        }
        return normalized;
    }

    private String generateClientId(String merchantId) {
        String slug = merchantId.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if (slug.length() > 16) slug = slug.substring(0, 16);
        String candidate;
        do {
            byte[] bytes = new byte[8];
            SECURE_RANDOM.nextBytes(bytes);
            candidate = "sd_m_" + slug + "_" + HexFormat.of().formatHex(bytes);
        } while (clientRepository.existsByClientId(candidate));
        return candidate;
    }

    private String generateClientSecret() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return "sd_sec_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void recordHistory(OAuthClient client, String action, String performedBy, String details) {
        OAuthCredentialHistory h = new OAuthCredentialHistory();
        h.setClientPkId(client.getId());
        h.setClientId(client.getClientId());
        h.setMerchantId(client.getMerchantId());
        h.setAction(action);
        h.setPerformedBy(performedBy != null && !performedBy.isBlank() ? performedBy : "system");
        h.setDetails(details);
        historyRepository.save(h);
    }

    private OAuthClientResponse toResponse(OAuthClient client) {
        OAuthClientResponse dto = new OAuthClientResponse();
        populateBase(client, dto);
        return dto;
    }

    private OAuthClientProvisionedResponse toProvisionedResponse(OAuthClient client, String rawSecret) {
        OAuthClientProvisionedResponse dto = new OAuthClientProvisionedResponse();
        populateBase(client, dto);
        dto.setClientSecret(rawSecret);
        return dto;
    }

    private void populateBase(OAuthClient client, OAuthClientResponse dto) {
        dto.setId(client.getId());
        dto.setClientId(client.getClientId());
        dto.setMerchantId(client.getMerchantId());
        dto.setMerchantName(client.getMerchantName());
        dto.setStatus(client.getStatus().name());
        dto.setScopes(new ArrayList<>(client.getScopes()));
        dto.setTokenEndpoint(publicTokenEndpoint);
        dto.setCreatedAt(client.getCreatedAt());
        dto.setUpdatedAt(client.getUpdatedAt());
        dto.setExpiresAt(client.getExpiresAt());
        dto.setLastUsedAt(client.getLastUsedAt());
        dto.setRevokedAt(client.getRevokedAt());
        dto.setRevocationReason(client.getRevocationReason());
    }

    private OAuthCredentialHistoryResponse toHistoryResponse(OAuthCredentialHistory h) {
        OAuthCredentialHistoryResponse dto = new OAuthCredentialHistoryResponse();
        dto.setId(h.getId());
        dto.setClientId(h.getClientId());
        dto.setMerchantId(h.getMerchantId());
        dto.setAction(h.getAction());
        dto.setPerformedBy(h.getPerformedBy());
        dto.setDetails(h.getDetails());
        dto.setCreatedAt(h.getCreatedAt());
        return dto;
    }
}

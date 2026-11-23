package com.swiftdrop.identity.security;

import com.swiftdrop.identity.entity.OAuthClient;
import com.swiftdrop.identity.repository.OAuthClientRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.ZoneOffset;

/**
 * Spring Authorization Server RegisteredClientRepository backed by our `oauth_clients` table.
 * Enforces that only ACTIVE, non-expired merchant OAuth clients can authenticate at `/oauth2/token`.
 */
@Component
public class MerchantRegisteredClientRepository implements RegisteredClientRepository {

    private final OAuthClientRepository clientRepository;
    private final long tokenTtlSeconds;

    public MerchantRegisteredClientRepository(
            OAuthClientRepository clientRepository,
            @Value("${app.oauth2.access-token-ttl-seconds:3600}") long tokenTtlSeconds) {
        this.clientRepository = clientRepository;
        this.tokenTtlSeconds = tokenTtlSeconds;
    }

    @Override
    public void save(RegisteredClient registeredClient) {
        // Managed exclusively via MerchantOAuthClientService to enforce audit logging and BCrypt hashing
    }

    @Override
    public RegisteredClient findById(String id) {
        if (id == null || id.isBlank()) return null;
        try {
            Long pk = Long.parseLong(id);
            return clientRepository.findById(pk)
                    .filter(OAuthClient::isEffectivelyActive)
                    .map(this::toRegisteredClient)
                    .orElse(null);
        } catch (NumberFormatException ex) {
            return findByClientId(id);
        }
    }

    @Override
    public RegisteredClient findByClientId(String clientId) {
        if (clientId == null || clientId.isBlank()) return null;
        return clientRepository.findByClientId(clientId.trim())
                .filter(OAuthClient::isEffectivelyActive)
                .map(this::toRegisteredClient)
                .orElse(null);
    }

    private RegisteredClient toRegisteredClient(OAuthClient entity) {
        RegisteredClient.Builder builder = RegisteredClient.withId(String.valueOf(entity.getId()))
                .clientId(entity.getClientId())
                .clientSecret(entity.getClientSecretHash())
                .clientName(entity.getMerchantName())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofSeconds(tokenTtlSeconds))
                        .build());

        if (entity.getExpiresAt() != null) {
            builder.clientSecretExpiresAt(entity.getExpiresAt().toInstant(ZoneOffset.UTC));
        }

        for (String scope : entity.getScopes()) {
            builder.scope(scope);
        }

        return builder.build();
    }
}

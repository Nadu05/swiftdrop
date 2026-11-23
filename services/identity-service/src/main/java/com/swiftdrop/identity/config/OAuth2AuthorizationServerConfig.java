package com.swiftdrop.identity.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.swiftdrop.identity.entity.OAuthClient;
import com.swiftdrop.identity.repository.OAuthClientRepository;
import com.swiftdrop.identity.security.JwtService;
import com.swiftdrop.identity.service.MerchantOAuthClientService;
import io.jsonwebtoken.io.Decoders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

/**
 * Spring Authorization Server configuration for OAuth 2.0 Client Credentials Grant (`POST /oauth2/token`).
 *
 * Signs access tokens with the shared SwiftDrop HMAC-SHA256 key (`app.jwt.secret`) and
 * `iss = "swiftdrop-identity-service"` so Order Service, Organization Service, and API Gateway
 * validate merchant OAuth 2.0 Bearer tokens natively alongside user JWTs.
 */
@Configuration
public class OAuth2AuthorizationServerConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);
        return http.build();
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings(
            @Value("${app.oauth2.issuer:http://localhost:8080}") String issuerUrl) {
        return AuthorizationServerSettings.builder()
                .issuer(issuerUrl)
                .tokenEndpoint("/oauth2/token")
                .build();
    }

    @Bean
    public JwtEncoder oauth2JwtEncoder(@Value("${app.jwt.secret}") String jwtSecret) {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(jwtSecret);
            if (keyBytes.length < 32) {
                keyBytes = sha256(jwtSecret);
            }
        } catch (Exception ex) {
            keyBytes = sha256(jwtSecret);
        }
        SecretKey secretKey = new SecretKeySpec(keyBytes, "HmacSHA256");
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey));
    }

    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> merchantOAuthTokenCustomizer(
            OAuthClientRepository clientRepository,
            MerchantOAuthClientService oauthClientService) {
        return context -> {
            if (!OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
                return;
            }
            context.getJwsHeader().algorithm(MacAlgorithm.HS256);

            if (AuthorizationGrantType.CLIENT_CREDENTIALS.equals(context.getAuthorizationGrantType())) {
                String clientId = context.getRegisteredClient().getClientId();
                OAuthClient merchantClient = clientRepository.findByClientId(clientId).orElse(null);
                if (merchantClient != null) {
                    context.getClaims()
                            .claim("iss", JwtService.ISSUER)
                            .claim("roles", List.of("ROLE_MERCHANT"))
                            .claim("organizationId", merchantClient.getMerchantId())
                            .claim("merchantId", merchantClient.getMerchantId())
                            .claim("userId", "oauth:" + merchantClient.getClientId())
                            .claim("clientId", merchantClient.getClientId())
                            .claim("tokenType", "OAUTH2_CLIENT_CREDENTIALS");
                    oauthClientService.recordTokenIssued(clientId);
                }
            }
        };
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}

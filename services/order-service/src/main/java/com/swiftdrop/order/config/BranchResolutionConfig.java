package com.swiftdrop.order.config;

import com.swiftdrop.order.branch.BranchResolver;
import com.swiftdrop.order.branch.OrganizationBranchResolver;
import com.swiftdrop.order.branch.OrganizationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

/** Wires the {@link BranchResolver}: the real Organization client, or a no-op when switched off. */
@Configuration
@EnableConfigurationProperties(OrganizationProperties.class)
public class BranchResolutionConfig {

    @Bean
    public BranchResolver branchResolver(OrganizationProperties properties) {
        if (!properties.branchResolutionEnabled()) {
            return pickup -> Optional.empty();
        }
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(properties.connectTimeoutMs()));
        factory.setReadTimeout(Duration.ofMillis(properties.readTimeoutMs()));
        RestClient client = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(factory)
                .build();
        return new OrganizationBranchResolver(client);
    }
}

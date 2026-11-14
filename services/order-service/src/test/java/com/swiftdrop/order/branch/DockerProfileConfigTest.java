package com.swiftdrop.order.branch;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Inside Docker "localhost" is the container itself, so under the {@code docker} profile (which the compose files
 * activate) the Organization service must be addressed by its compose service name, not by the default
 * {@code http://localhost:8082}. Without this every order creation in Docker would fail with 503.
 */
class DockerProfileConfigTest {

    private static StandardEnvironment environmentWith(String resource, Map<String, Object> overrides) throws IOException {
        StandardEnvironment env = new StandardEnvironment();
        // later (higher precedence) first: overrides, then the docker file, then the base file
        List<PropertySource<?>> docker = new YamlPropertySourceLoader().load("docker", new ClassPathResource(resource));
        List<PropertySource<?>> base = new YamlPropertySourceLoader().load("base", new ClassPathResource("application.yml"));
        base.forEach(env.getPropertySources()::addLast);
        docker.forEach(env.getPropertySources()::addFirst);
        if (!overrides.isEmpty()) {
            env.getPropertySources().addFirst(new MapPropertySource("overrides", overrides));
        }
        return env;
    }

    @Test
    @DisplayName("the docker profile points the Organization client at the compose service name")
    void dockerUsesServiceName() throws IOException {
        StandardEnvironment env = environmentWith("application-docker.yml", Map.of());

        assertThat(env.getProperty("swiftdrop.organization.base-url")).isEqualTo("http://organization-service:8082");
    }

    @Test
    @DisplayName("ORGANIZATION_SERVICE_URL still overrides it")
    void environmentVariableWins() throws IOException {
        StandardEnvironment env = environmentWith("application-docker.yml", Map.of("ORGANIZATION_SERVICE_URL", "http://other:9999"));

        assertThat(env.getProperty("swiftdrop.organization.base-url")).isEqualTo("http://other:9999");
    }

    @Test
    @DisplayName("without the docker profile the default stays localhost (service running on the developer's PC)")
    void defaultIsLocalhost() throws IOException {
        StandardEnvironment env = new StandardEnvironment();
        new YamlPropertySourceLoader().load("base", new ClassPathResource("application.yml")).forEach(env.getPropertySources()::addLast);

        assertThat(env.getProperty("swiftdrop.organization.base-url")).isEqualTo("http://localhost:8082");
    }
}

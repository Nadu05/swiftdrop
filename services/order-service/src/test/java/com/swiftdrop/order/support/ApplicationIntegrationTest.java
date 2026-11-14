package com.swiftdrop.order.support;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.RabbitMQContainer;

/**
 * Full-application integration tests: real PostgreSQL (from the parent) and a real RabbitMQ broker.
 * All subclasses share one cached Spring context. The background outbox relay is switched off so tests
 * decide exactly when events are published.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET,
        "swiftdrop.security.service-api-key=" + TestTokens.SERVICE_KEY,
        "swiftdrop.outbox.enabled=false"
})
public abstract class ApplicationIntegrationTest extends PostgresIntegrationTest {

    protected static final String EVENTS_QUEUE = "order.events.queue";

    private static final RabbitMQContainer RABBIT = new RabbitMQContainer("rabbitmq:3.13-alpine");

    static {
        RABBIT.start();
    }

    @DynamicPropertySource
    static void rabbitProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", RABBIT::getHost);
        registry.add("spring.rabbitmq.port", RABBIT::getAmqpPort);
        registry.add("spring.rabbitmq.username", RABBIT::getAdminUsername);
        registry.add("spring.rabbitmq.password", RABBIT::getAdminPassword);
    }
}

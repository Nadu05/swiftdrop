package com.swiftdrop.organization.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String EVENTS_EXCHANGE = "swiftdrop.events";
    public static final String ORGANIZATION_EXCHANGE = "swiftdrop.organization.exchange";
    public static final String ORGANIZATION_QUEUE = "swiftdrop.organization.queue";
    public static final String ORGANIZATION_ROUTING_KEY = "organization.event.#";

    /**
     * Shared SwiftDrop domain events topic exchange (agent.backend.md §1, §4.2).
     * Declared as durable and non-auto-delete so published merchant lifecycle events
     * always have a valid target exchange on the broker.
     */
    @Bean
    public TopicExchange eventsExchange(
            @Value("${swiftdrop.rabbitmq.exchange:" + EVENTS_EXCHANGE + "}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public TopicExchange organizationExchange() { return new TopicExchange(ORGANIZATION_EXCHANGE, true, false); }
    @Bean
    public Queue organizationQueue() { return QueueBuilder.durable(ORGANIZATION_QUEUE).build(); }
    @Bean
    public Binding organizationBinding(Queue organizationQueue,
                                       @Qualifier("organizationExchange") TopicExchange organizationExchange) {
        return BindingBuilder.bind(organizationQueue).to(organizationExchange).with(ORGANIZATION_ROUTING_KEY);
    }
    @Bean
    public MessageConverter jsonMessageConverter() { return new Jackson2JsonMessageConverter(); }
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}

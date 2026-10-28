package com.swiftdrop.identity.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ configuration for the identity service.
 * Defines exchanges and queues for identity-related events.
 */
@Configuration
public class RabbitMQConfig {

    public static final String IDENTITY_EXCHANGE = "swiftdrop.identity.exchange";
    public static final String IDENTITY_QUEUE = "swiftdrop.identity.queue";
    public static final String IDENTITY_ROUTING_KEY = "identity.event.#";

    @Bean
    public TopicExchange identityExchange() {
        return new TopicExchange(IDENTITY_EXCHANGE);
    }

    @Bean
    public Queue identityQueue() {
        return QueueBuilder.durable(IDENTITY_QUEUE).build();
    }

    @Bean
    public Binding identityBinding(Queue identityQueue, TopicExchange identityExchange) {
        return BindingBuilder.bind(identityQueue).to(identityExchange).with(IDENTITY_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}

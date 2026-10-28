package com.swiftdrop.organization.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    public static final String ORGANIZATION_EXCHANGE = "swiftdrop.organization.exchange";
    public static final String ORGANIZATION_QUEUE = "swiftdrop.organization.queue";
    public static final String ORGANIZATION_ROUTING_KEY = "organization.event.#";

    @Bean
    public TopicExchange organizationExchange() { return new TopicExchange(ORGANIZATION_EXCHANGE); }
    @Bean
    public Queue organizationQueue() { return QueueBuilder.durable(ORGANIZATION_QUEUE).build(); }
    @Bean
    public Binding organizationBinding(Queue organizationQueue, TopicExchange organizationExchange) {
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

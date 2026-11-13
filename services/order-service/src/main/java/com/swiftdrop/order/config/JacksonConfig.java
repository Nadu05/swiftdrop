package com.swiftdrop.order.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.deser.std.StdScalarDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class JacksonConfig {

    /**
     * Trims every string in incoming JSON before bean validation runs, so values such as
     * {@code "     "} or {@code "  ab  "} cannot slip past the length and not-blank rules.
     */
    @Bean
    public Module stringTrimmingModule() {
        SimpleModule module = new SimpleModule("StringTrimmingModule");
        module.addDeserializer(String.class, new StdScalarDeserializer<String>(String.class) {
            @Override
            public String deserialize(JsonParser parser, DeserializationContext context) throws IOException {
                String value = parser.getValueAsString();
                return value == null ? null : value.trim();
            }
        });
        return module;
    }
}

package com.swiftdrop.order.assistant.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.config.AiAssistantProperties;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Spring RestClient implementation of {@link LlmClient} targeting OpenAI-compatible Chat Completions APIs.
 * Uses bounded timeouts, zero retry loops, and safe error sanitization.
 */
@Component
public class RestLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(RestLlmClient.class);

    public static final String SAFE_UNAVAILABLE_MESSAGE =
            "Sorry, I'm temporarily unable to respond. Please try again in a moment.";

    private final RestClient restClient;
    private final AiAssistantProperties properties;
    private final ObjectMapper objectMapper;
    private final String endpointPath;

    @Autowired
    public RestLlmClient(AiAssistantProperties properties, ObjectMapper objectMapper) {
        this(createTimeoutBuilder(properties), properties, objectMapper);
    }

    public RestLlmClient(RestClient.Builder builder, AiAssistantProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String normalizedBaseUrl = normalizeBaseUrl(properties.getBaseUrl());
        this.endpointPath = resolveEndpointPath(normalizedBaseUrl);
        this.restClient = builder.baseUrl(normalizedBaseUrl).build();
    }

    private static RestClient.Builder createTimeoutBuilder(AiAssistantProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(Math.max(500, properties.getConnectTimeoutMs())));
        factory.setReadTimeout(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs())));
        return RestClient.builder().requestFactory(factory);
    }

    @Override
    public String generateReply(String systemPrompt, List<LlmMessage> history, String userMessage) {
        if (!properties.isConfigured()) {
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        if (history != null) {
            for (LlmMessage msg : history) {
                if (msg != null && msg.role() != null && msg.content() != null && !msg.content().isBlank()) {
                    messages.add(Map.of("role", msg.role(), "content", msg.content()));
                }
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", properties.getModel());
        payload.put("messages", messages);
        payload.put("temperature", 0.3);
        payload.put("max_tokens", 500);

        try {
            String rawBody = restClient.post()
                    .uri(endpointPath)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey().trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (rawBody == null || rawBody.isBlank()) {
                log.warn("LLM provider '{}' returned an empty response body", properties.getProvider());
                throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
            }

            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
            String reply = contentNode.isTextual() ? contentNode.asText().trim() : "";

            if (reply.isBlank()) {
                log.warn("LLM provider '{}' returned a response without message content", properties.getProvider());
                throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
            }

            return reply;
        } catch (AiAssistantException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            log.warn("LLM provider '{}' connection/timeout error: {}",
                    properties.getProvider(), ex.getClass().getSimpleName());
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE, ex);
        } catch (RestClientResponseException ex) {
            log.warn("LLM provider '{}' returned HTTP status {}",
                    properties.getProvider(), ex.getStatusCode().value());
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE, ex);
        } catch (Exception ex) {
            log.warn("LLM provider '{}' invocation failed: {}",
                    properties.getProvider(), ex.getClass().getSimpleName());
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE, ex);
        }
    }

    private static String normalizeBaseUrl(String rawBaseUrl) {
        String normalized = rawBaseUrl == null ? "" : rawBaseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static String resolveEndpointPath(String normalizedBaseUrl) {
        if (normalizedBaseUrl.endsWith("/chat/completions")) {
            return "";
        }
        if (normalizedBaseUrl.endsWith("/v1")) {
            return "/chat/completions";
        }
        return "/v1/chat/completions";
    }
}

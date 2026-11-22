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
import java.util.Locale;
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
        boolean apiKeyConfigured = properties.getApiKey() != null && !properties.getApiKey().isBlank();
        log.info(
                "SwiftDrop AI RestLlmClient initialized (enabled={}, provider={}, model={}, baseUrl={}, endpointPath={}, apiKeyConfigured={})",
                properties.isEnabled(),
                properties.getProvider(),
                properties.getModel(),
                normalizedBaseUrl,
                this.endpointPath,
                apiKeyConfigured
        );
    }

    private static RestClient.Builder createTimeoutBuilder(AiAssistantProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(Math.max(500, properties.getConnectTimeoutMs())));
        factory.setReadTimeout(Duration.ofMillis(Math.max(1000, properties.getReadTimeoutMs())));
        return RestClient.builder().requestFactory(factory);
    }

    private static final int MAX_TOOL_ROUNDS = 3;

    @Override
    public String generateReply(String systemPrompt, List<LlmMessage> history, String userMessage) {
        return generateReply(systemPrompt, history, userMessage, List.of(), null);
    }

    @Override
    public String generateReply(
            String systemPrompt,
            List<LlmMessage> history,
            String userMessage,
            List<LlmToolDefinition> tools,
            ToolExecutor toolExecutor) {
        if (!properties.isConfigured()) {
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
        }

        List<Object> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        if (history != null) {
            for (LlmMessage msg : history) {
                if (msg != null && msg.role() != null && msg.content() != null && !msg.content().isBlank()) {
                    messages.add(Map.of("role", msg.role(), "content", msg.content()));
                }
            }
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        List<Map<String, Object>> toolSpecs = buildToolSpecs(tools);

        Map<String, String> executedToolResults = new LinkedHashMap<>();

        try {
            for (int round = 0; round <= MAX_TOOL_ROUNDS; round++) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("model", properties.getModel());
                payload.put("messages", messages);
                payload.put("temperature", 0.3);
                payload.put("max_tokens", 500);
                if (!toolSpecs.isEmpty()) {
                    payload.put("tools", toolSpecs);
                    if (round == 0) {
                        payload.put("tool_choice", "auto");
                    }
                }

                String rawBody = postChatCompletion(payload);

                if (rawBody == null || rawBody.isBlank()) {
                    log.warn("LLM provider '{}' returned an empty response body", properties.getProvider());
                    throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
                }

                JsonNode root = objectMapper.readTree(rawBody);
                JsonNode messageNode = root.path("choices").path(0).path("message");
                JsonNode toolCallsNode = messageNode.path("tool_calls");

                if (toolCallsNode.isArray() && !toolCallsNode.isEmpty() && toolExecutor != null) {
                    if (round == MAX_TOOL_ROUNDS) {
                        log.warn("LLM provider '{}' exceeded maximum tool call rounds ({})",
                                properties.getProvider(), MAX_TOOL_ROUNDS);
                        throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
                    }

                    // Preserve exact assistant tool_calls message (including Gemini thought_signature metadata)
                    messages.add(messageNode);

                    for (int idx = 0; idx < toolCallsNode.size(); idx++) {
                        JsonNode tc = toolCallsNode.get(idx);
                        String callId = tc.path("id").asText("call_" + round + "_" + idx);
                        JsonNode fnNode = tc.path("function");
                        String toolName = fnNode.path("name").asText("");
                        JsonNode argsNode = fnNode.path("arguments");
                        String argsJson = argsNode.isTextual() ? argsNode.asText() : argsNode.toString();

                        String signature = toolName + "|" + (argsJson != null ? argsJson.trim() : "");
                        String toolResult = executedToolResults.get(signature);
                        if (toolResult == null) {
                            toolResult = toolExecutor.execute(new LlmToolCall(callId, toolName, argsJson));
                            toolResult = toolResult != null ? toolResult : "{}";
                            executedToolResults.put(signature, toolResult);
                        } else {
                            log.debug("Reusing cached result for duplicate tool call '{}' within same turn", toolName);
                        }

                        Map<String, Object> toolMessage = new LinkedHashMap<>();
                        toolMessage.put("role", "tool");
                        toolMessage.put("tool_call_id", callId);
                        toolMessage.put("name", toolName);
                        toolMessage.put("content", toolResult);
                        messages.add(toolMessage);
                    }
                    continue;
                }

                JsonNode contentNode = messageNode.path("content");
                String reply = contentNode.isTextual() ? contentNode.asText().trim() : "";

                if (reply.isBlank()) {
                    log.warn("LLM provider '{}' returned a response without message content", properties.getProvider());
                    throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
                }

                return reply;
            }

            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, SAFE_UNAVAILABLE_MESSAGE);
        } catch (AiAssistantException ex) {
            throw ex;
        } catch (ResourceAccessException ex) {
            Throwable cause = ex.getMostSpecificCause();
            log.warn("LLM provider '{}' connection/timeout error after retry ({}): {}",
                    properties.getProvider(),
                    cause != null ? cause.getClass().getSimpleName() : ex.getClass().getSimpleName(),
                    cause != null && cause.getMessage() != null ? cause.getMessage() : ex.getMessage());
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

    private String postChatCompletion(Map<String, Object> payload) {
        ResourceAccessException lastException = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                return restClient.post()
                        .uri(endpointPath)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey().trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(payload)
                        .retrieve()
                        .body(String.class);
            } catch (ResourceAccessException ex) {
                lastException = ex;
                if (attempt == 1) {
                    Throwable cause = ex.getMostSpecificCause();
                    log.warn("LLM provider '{}' transient connection/timeout error on attempt 1 ({}); retrying once",
                            properties.getProvider(),
                            cause != null ? cause.getClass().getSimpleName() : ex.getClass().getSimpleName());
                } else {
                    throw ex;
                }
            }
        }
        throw lastException;
    }

    private List<Map<String, Object>> buildToolSpecs(List<LlmToolDefinition> tools) {
        if (tools == null || tools.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> specs = new ArrayList<>(tools.size());
        for (LlmToolDefinition def : tools) {
            if (def == null || def.name() == null || def.name().isBlank()) {
                continue;
            }
            Map<String, Object> functionMap = new LinkedHashMap<>();
            functionMap.put("name", def.name());
            functionMap.put("description", def.description());
            functionMap.put("parameters", def.parametersSchema());

            Map<String, Object> toolSpec = new LinkedHashMap<>();
            toolSpec.put("type", "function");
            toolSpec.put("function", functionMap);
            specs.add(toolSpec);
        }
        return specs;
    }

    private static String normalizeBaseUrl(String rawBaseUrl) {
        String normalized = rawBaseUrl == null ? "" : rawBaseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static String resolveEndpointPath(String normalizedBaseUrl) {
        String lower = normalizedBaseUrl.toLowerCase(Locale.ROOT);
        if (lower.endsWith("/chat/completions")) {
            return "";
        }
        if (lower.endsWith("/v1")
                || lower.endsWith("/v1beta/openai")
                || lower.endsWith("/openai")) {
            return "/chat/completions";
        }
        return "/v1/chat/completions";
    }
}

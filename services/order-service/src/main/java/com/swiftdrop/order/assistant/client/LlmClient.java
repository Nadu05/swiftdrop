package com.swiftdrop.order.assistant.client;

import java.util.List;
import java.util.Map;

/**
 * Abstraction over the external LLM provider for generating customer assistant replies.
 */
public interface LlmClient {

    record LlmMessage(String role, String content) {
    }

    record LlmToolDefinition(String name, String description, Map<String, Object> parametersSchema) {
    }

    record LlmToolCall(String id, String name, String argumentsJson) {
    }

    @FunctionalInterface
    interface ToolExecutor {
        String execute(LlmToolCall toolCall);
    }

    String generateReply(String systemPrompt, List<LlmMessage> history, String userMessage);

    default String generateReply(
            String systemPrompt,
            List<LlmMessage> history,
            String userMessage,
            List<LlmToolDefinition> tools,
            ToolExecutor toolExecutor) {
        return generateReply(systemPrompt, history, userMessage);
    }
}

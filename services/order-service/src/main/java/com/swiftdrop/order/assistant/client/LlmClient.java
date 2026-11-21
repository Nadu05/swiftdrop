package com.swiftdrop.order.assistant.client;

import java.util.List;

/**
 * Abstraction over the external LLM provider for generating customer assistant replies.
 */
public interface LlmClient {

    record LlmMessage(String role, String content) {
    }

    String generateReply(String systemPrompt, List<LlmMessage> history, String userMessage);
}

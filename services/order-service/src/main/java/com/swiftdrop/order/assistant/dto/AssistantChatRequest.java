package com.swiftdrop.order.assistant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Validated request payload for the Customer AI Delivery Assistant.
 * Identity is intentionally omitted and always resolved from the verified JWT principal.
 */
public class AssistantChatRequest {

    @NotBlank(message = "Message cannot be blank")
    @Size(max = 1000, message = "Message cannot exceed 1000 characters")
    private String message;

    @Size(max = 100, message = "Conversation ID cannot exceed 100 characters")
    private String conversationId;

    @Valid
    @Size(max = 20, message = "Conversation history cannot exceed 20 messages")
    private List<HistoryMessageDto> history;

    public AssistantChatRequest() {
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public List<HistoryMessageDto> getHistory() {
        return history;
    }

    public void setHistory(List<HistoryMessageDto> history) {
        this.history = history;
    }

    public static class HistoryMessageDto {

        @NotBlank(message = "History message role is required")
        @Pattern(regexp = "^(user|assistant)$", message = "History message role must be 'user' or 'assistant'")
        private String role;

        @NotBlank(message = "History message content cannot be blank")
        @Size(max = 1000, message = "History message content cannot exceed 1000 characters")
        private String content;

        public HistoryMessageDto() {
        }

        public HistoryMessageDto(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}

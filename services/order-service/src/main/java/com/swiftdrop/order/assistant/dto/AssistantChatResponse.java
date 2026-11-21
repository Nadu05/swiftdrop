package com.swiftdrop.order.assistant.dto;

/**
 * Response payload returned by the Customer AI Delivery Assistant.
 */
public class AssistantChatResponse {

    private String reply;
    private String category = "assistant";
    private String conversationId;
    private String timestamp;

    public AssistantChatResponse() {
    }

    public AssistantChatResponse(String reply, String category, String conversationId, String timestamp) {
        this.reply = reply;
        this.category = category != null && !category.isBlank() ? category : "assistant";
        this.conversationId = conversationId;
        this.timestamp = timestamp;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}

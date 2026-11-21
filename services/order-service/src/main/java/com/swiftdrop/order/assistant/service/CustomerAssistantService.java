package com.swiftdrop.order.assistant.service;

import com.swiftdrop.order.assistant.client.LlmClient;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.RestLlmClient;
import com.swiftdrop.order.assistant.config.AiAssistantProperties;
import com.swiftdrop.order.assistant.dto.AssistantChatRequest;
import com.swiftdrop.order.assistant.dto.AssistantChatRequest.HistoryMessageDto;
import com.swiftdrop.order.assistant.dto.AssistantChatResponse;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import com.swiftdrop.order.security.OrderUserPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Customer-only AI Delivery Assistant orchestration service (Phase 1 foundation).
 * Enforces CUSTOMER role authorization, input limits, per-user rate limiting, and prompt boundaries.
 */
@Service
public class CustomerAssistantService {

    private static final Logger log = LoggerFactory.getLogger(CustomerAssistantService.class);

    public static final String SYSTEM_PROMPT = """
            You are SwiftDrop AI — Customer Delivery Assistant for the SwiftDrop Parcel Delivery & Courier Management System.

            Your scope:
            - Help customers understand parcel tracking, delivery fee inquiries, how to send parcels, pickup vs. branch drop-off options, Prepaid vs. Cash on Delivery (COD) payment choices, and general SwiftDrop delivery services.
            - Explain standard SwiftDrop delivery statuses clearly:
              Created, Confirmed, Pickup Assigned, Picked Up, At Origin Branch, In Transit, At Destination Branch, Out for Delivery, Delivered, Delivery Failed, Pending Dispatcher Decision (after up to 3 unsuccessful delivery attempts), Return to Sender, Returned to Sender, and Cancelled.

            Communication style:
            - Be polite, friendly, concise, clear, and professional.
            - Communicate naturally and support customers who write in simple English.
            - Ask helpful clarifying questions when information is missing.

            Strict accuracy and safety rules:
            - You currently do NOT have access to live parcel databases, tracking lookups, or live fee calculators.
            - NEVER claim you have looked up or retrieved real parcel statuses, courier details, or exact delivery quotes.
            - NEVER invent delivery prices, parcel statuses, courier information, delivery dates, contact numbers, or unverified company policies.
            - Clearly distinguish general guidance from verified account/order information, and guide customers to use the existing Customer Portal pages ('Track Parcel', 'Create Delivery', or 'My Deliveries') for live data or actions.
            - NEVER claim to create, cancel, assign, modify, or update any delivery order.
            - Politely refuse requests related to dispatcher operations, courier management, courier assignments, merchant API integration, merchant onboarding, admin dashboard operations, internal delivery management, changing parcel statuses, or managing delivery zones/pricing rules.
            """;

    private final AiAssistantProperties properties;
    private final AssistantRateLimiter rateLimiter;
    private final LlmClient llmClient;

    public CustomerAssistantService(
            AiAssistantProperties properties,
            AssistantRateLimiter rateLimiter,
            LlmClient llmClient) {
        this.properties = properties;
        this.rateLimiter = rateLimiter;
        this.llmClient = llmClient;
    }

    public AssistantChatResponse chat(AssistantChatRequest request, OrderUserPrincipal principal) {
        validateCustomerPrincipal(principal);

        if (request == null || request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be blank");
        }

        String trimmedMessage = request.getMessage().trim();
        int maxLength = Math.max(1, properties.getMaxMessageLength());
        if (trimmedMessage.length() > maxLength) {
            throw new IllegalArgumentException("Message cannot exceed " + maxLength + " characters");
        }

        rateLimiter.checkAndRecord(principal.userId());

        if (!properties.isConfigured()) {
            log.warn("Customer AI assistant request rejected because AI configuration is disabled or incomplete");
            throw new AiAssistantException(HttpStatus.SERVICE_UNAVAILABLE, RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
        }

        List<LlmMessage> boundedHistory = normalizeHistory(request.getHistory(), maxLength);
        String reply = llmClient.generateReply(SYSTEM_PROMPT, boundedHistory, trimmedMessage);

        String conversationId = (request.getConversationId() != null && !request.getConversationId().isBlank())
                ? request.getConversationId().trim()
                : UUID.randomUUID().toString();

        return new AssistantChatResponse(
                reply,
                "assistant",
                conversationId,
                LocalDateTime.now().toString()
        );
    }

    private void validateCustomerPrincipal(OrderUserPrincipal principal) {
        if (principal == null || principal.userId() == null || principal.userId().isBlank()) {
            throw new AccessDeniedException("Authentication is required to use SwiftDrop AI");
        }

        boolean isCustomerOnly = principal.hasRole("CUSTOMER")
                && !principal.isGlobalAdmin()
                && !principal.isBranchScopedStaff()
                && !principal.hasRole("SYSTEM_ADMIN")
                && !principal.hasRole("COURIER")
                && !principal.hasRole("MERCHANT");

        if (!isCustomerOnly) {
            throw new AccessDeniedException("SwiftDrop AI is available exclusively to authenticated customers");
        }
    }

    private List<LlmMessage> normalizeHistory(List<HistoryMessageDto> rawHistory, int maxLength) {
        if (rawHistory == null || rawHistory.isEmpty()) {
            return List.of();
        }

        int maxHistory = Math.max(0, properties.getMaxHistoryMessages());
        if (maxHistory == 0) {
            return List.of();
        }

        int startIndex = Math.max(0, rawHistory.size() - maxHistory);
        List<LlmMessage> normalized = new ArrayList<>();

        for (int i = startIndex; i < rawHistory.size(); i++) {
            HistoryMessageDto item = rawHistory.get(i);
            if (item == null || item.getRole() == null || item.getContent() == null) {
                continue;
            }
            String role = item.getRole().trim();
            String content = item.getContent().trim();
            if ((!"user".equals(role) && !"assistant".equals(role)) || content.isEmpty()) {
                continue;
            }
            if (content.length() > maxLength) {
                content = content.substring(0, maxLength);
            }
            normalized.add(new LlmMessage(role, content));
        }

        return normalized;
    }
}

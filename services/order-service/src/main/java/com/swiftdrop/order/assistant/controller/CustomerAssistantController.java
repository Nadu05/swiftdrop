package com.swiftdrop.order.assistant.controller;

import com.swiftdrop.order.assistant.dto.AssistantChatRequest;
import com.swiftdrop.order.assistant.dto.AssistantChatResponse;
import com.swiftdrop.order.assistant.service.CustomerAssistantService;
import com.swiftdrop.order.security.OrderUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Customer-only REST controller for SwiftDrop AI delivery assistance.
 * Supports both direct (/api/v1/orders/assistant/chat) and API Gateway stripped (/assistant/chat) paths.
 */
@RestController
@Tag(name = "Customer AI Assistant", description = "Customer-only AI Delivery Assistant chat endpoint")
public class CustomerAssistantController {

    private final CustomerAssistantService assistantService;

    public CustomerAssistantController(CustomerAssistantService assistantService) {
        this.assistantService = assistantService;
    }

    @PostMapping({
            "/api/v1/orders/assistant/chat",
            "/orders/assistant/chat",
            "/assistant/chat"
    })
    @Operation(summary = "Send a message to the SwiftDrop Customer AI Delivery Assistant")
    public ResponseEntity<AssistantChatResponse> chat(
            @Valid @RequestBody AssistantChatRequest request,
            @AuthenticationPrincipal OrderUserPrincipal principal) {
        return ResponseEntity.ok(assistantService.chat(request, principal));
    }
}

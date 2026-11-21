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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerAssistantServiceTest {

    @Mock
    private LlmClient llmClient;

    private AiAssistantProperties properties;
    private MutableClock clock;
    private AssistantRateLimiter rateLimiter;
    private CustomerAssistantService assistantService;

    private static final OrderUserPrincipal CUSTOMER_A =
            new OrderUserPrincipal("cust-a", "a@swiftdrop.lk", null, List.of("CUSTOMER"));
    private static final OrderUserPrincipal CUSTOMER_B =
            new OrderUserPrincipal("cust-b", "b@swiftdrop.lk", null, List.of("CUSTOMER"));

    @BeforeEach
    void setUp() {
        properties = new AiAssistantProperties();
        properties.setEnabled(true);
        properties.setApiKey("test-api-key");
        properties.setModel("gpt-4o-mini");
        properties.setBaseUrl("https://api.openai.com");
        properties.setMaxMessageLength(1000);
        properties.setMaxHistoryMessages(2);
        properties.setRateLimitMaxRequests(2);
        properties.setRateLimitWindowSeconds(60);

        clock = new MutableClock(Instant.parse("2026-11-21T10:00:00Z"));
        rateLimiter = new AssistantRateLimiter(properties, clock);
        assistantService = new CustomerAssistantService(properties, rateLimiter, llmClient);
    }

    @Test
    void chat_ValidCustomerRequest_InvokesLlmWithSystemPromptAndBoundedHistory() {
        when(llmClient.generateReply(anyString(), anyList(), anyString()))
                .thenReturn("You can enter pickup and drop-off details on Create Delivery.");

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("  How do I send a parcel?  ");
        request.setConversationId("conv-99");
        request.setHistory(List.of(
                new HistoryMessageDto("user", "Old message"),
                new HistoryMessageDto("assistant", "Old reply"),
                new HistoryMessageDto("user", "Recent question")
        ));

        AssistantChatResponse response = assistantService.chat(request, CUSTOMER_A);

        assertThat(response.getReply()).isEqualTo("You can enter pickup and drop-off details on Create Delivery.");
        assertThat(response.getCategory()).isEqualTo("assistant");
        assertThat(response.getConversationId()).isEqualTo("conv-99");
        assertThat(response.getTimestamp()).isNotBlank();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<LlmMessage>> historyCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<String> systemPromptCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);

        verify(llmClient).generateReply(
                systemPromptCaptor.capture(),
                historyCaptor.capture(),
                messageCaptor.capture()
        );

        assertThat(systemPromptCaptor.getValue()).contains("SwiftDrop AI — Customer Delivery Assistant");
        assertThat(messageCaptor.getValue()).isEqualTo("How do I send a parcel?");
        assertThat(historyCaptor.getValue()).containsExactly(
                new LlmMessage("assistant", "Old reply"),
                new LlmMessage("user", "Recent question")
        );
    }

    @Test
    void chat_BlankOrOverlongMessage_ThrowsIllegalArgumentException() {
        AssistantChatRequest blankReq = new AssistantChatRequest();
        blankReq.setMessage("   ");

        assertThatThrownBy(() -> assistantService.chat(blankReq, CUSTOMER_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blank");

        properties.setMaxMessageLength(20);
        AssistantChatRequest longReq = new AssistantChatRequest();
        longReq.setMessage("This message is longer than twenty chars");

        assertThatThrownBy(() -> assistantService.chat(longReq, CUSTOMER_A))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("20");

        verifyNoInteractions(llmClient);
    }

    @Test
    void chat_UnauthenticatedOrNonCustomerRoles_ThrowsAccessDenied() {
        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Hello");

        assertThatThrownBy(() -> assistantService.chat(request, null))
                .isInstanceOf(AccessDeniedException.class);

        OrderUserPrincipal courier = new OrderUserPrincipal("c-1", "courier@swiftdrop.lk", null, List.of("COURIER"));
        OrderUserPrincipal dispatcher = new OrderUserPrincipal("d-1", "disp@swiftdrop.lk", null, List.of("DISPATCHER"), 1L);
        OrderUserPrincipal merchant = new OrderUserPrincipal("m-1", "merch@swiftdrop.lk", "org-1", List.of("MERCHANT", "CUSTOMER"));
        OrderUserPrincipal admin = new OrderUserPrincipal("a-1", "admin@swiftdrop.lk", null, List.of("ADMIN"));

        for (OrderUserPrincipal nonCustomer : List.of(courier, dispatcher, merchant, admin)) {
            assertThatThrownBy(() -> assistantService.chat(request, nonCustomer))
                    .isInstanceOf(AccessDeniedException.class);
        }

        verifyNoInteractions(llmClient);
    }

    @Test
    void chat_RateLimitExceeded_BlocksOnlyExceedingUserUntilWindowResets() {
        when(llmClient.generateReply(anyString(), anyList(), anyString())).thenReturn("Mock reply");

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Hello");

        assistantService.chat(request, CUSTOMER_A);
        assistantService.chat(request, CUSTOMER_A);

        assertThatThrownBy(() -> assistantService.chat(request, CUSTOMER_A))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> assertThat(((AiAssistantException) ex).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));

        // Different customer still has their own independent quota
        AssistantChatResponse customerBReply = assistantService.chat(request, CUSTOMER_B);
        assertThat(customerBReply.getReply()).isEqualTo("Mock reply");

        // Advance time past 60s window
        clock.advanceSeconds(61);
        AssistantChatResponse afterWindow = assistantService.chat(request, CUSTOMER_A);
        assertThat(afterWindow.getReply()).isEqualTo("Mock reply");
    }

    @Test
    void chat_MissingApiKeyOrDisabledAi_ThrowsServiceUnavailable() {
        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Where is my parcel?");

        properties.setApiKey("   ");
        assertThatThrownBy(() -> assistantService.chat(request, CUSTOMER_A))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> {
                    AiAssistantException aiEx = (AiAssistantException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).isEqualTo(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
                });

        properties.setApiKey("test-api-key");
        properties.setEnabled(false);
        assertThatThrownBy(() -> assistantService.chat(request, CUSTOMER_B))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> assertThat(((AiAssistantException) ex).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));

        verifyNoInteractions(llmClient);
    }

    @Test
    void chat_LlmFailureOrTimeout_Propagates503SafeException() {
        when(llmClient.generateReply(anyString(), anyList(), anyString()))
                .thenThrow(new AiAssistantException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        RestLlmClient.SAFE_UNAVAILABLE_MESSAGE
                ));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Explain delivery statuses");

        assertThatThrownBy(() -> assistantService.chat(request, CUSTOMER_A))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> {
                    AiAssistantException aiEx = (AiAssistantException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).isEqualTo(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
                });
    }

    private static final class MutableClock extends Clock {
        private Instant current;

        private MutableClock(Instant initial) {
            this.current = initial;
        }

        private void advanceSeconds(long seconds) {
            this.current = this.current.plusSeconds(seconds);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }
}

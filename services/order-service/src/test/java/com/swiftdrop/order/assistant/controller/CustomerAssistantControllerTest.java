package com.swiftdrop.order.assistant.controller;

import com.swiftdrop.order.assistant.client.RestLlmClient;
import com.swiftdrop.order.assistant.dto.AssistantChatRequest;
import com.swiftdrop.order.assistant.dto.AssistantChatResponse;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import com.swiftdrop.order.assistant.service.CustomerAssistantService;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.exception.GlobalExceptionHandler;
import com.swiftdrop.order.security.OrderJwtAuthenticationFilter;
import com.swiftdrop.order.security.OrderJwtService;
import com.swiftdrop.order.security.OrderUserPrincipal;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CustomerAssistantController.class)
@Import({
        SecurityConfig.class,
        OrderJwtAuthenticationFilter.class,
        OrderJwtService.class,
        GlobalExceptionHandler.class
})
class CustomerAssistantControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CustomerAssistantService assistantService;

    @Value("${app.jwt.secret:Y2hhbmdlLW1lLWluLXByb2R1Y3Rpb24tYW5kLXVzZS1hLXN0cm9uZy1zZWNyZXQtaGVyZS0xMjM0NTY3ODk=}")
    private String jwtSecret;

    private UsernamePasswordAuthenticationToken authToken(OrderUserPrincipal principal) {
        List<SimpleGrantedAuthority> authorities = principal.roles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                .toList();
        return new UsernamePasswordAuthenticationToken(principal, null, authorities);
    }

    private String mintAccessJwt(String userId, String email, List<String> roles) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
        return Jwts.builder()
                .issuer(OrderJwtService.EXPECTED_ISSUER)
                .subject(userId)
                .claim("userId", userId)
                .claim("email", email)
                .claim("roles", roles)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 300_000))
                .signWith(key)
                .compact();
    }

    @Test
    void chat_WithValidCustomerCookieJwtViaGatewayStrippedPath_Returns200() throws Exception {
        String token = mintAccessJwt("cust-101", "nimal@swiftdrop.lk", List.of("ROLE_CUSTOMER"));
        AssistantChatResponse response = new AssistantChatResponse(
                "You can track your parcel on the Track Parcel page using your tracking code.",
                "assistant",
                "conv-1",
                "2026-11-21T18:45:00"
        );

        when(assistantService.chat(any(AssistantChatRequest.class), any(OrderUserPrincipal.class)))
                .thenReturn(response);

        String payload = """
                {
                  "message": "How do I track my parcel?",
                  "conversationId": "conv-1"
                }
                """;

        mockMvc.perform(post("/assistant/chat")
                        .cookie(new Cookie("sd_access_token", token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(response.getReply()))
                .andExpect(jsonPath("$.category").value("assistant"))
                .andExpect(jsonPath("$.conversationId").value("conv-1"));
    }

    @Test
    void chat_WithValidAuthenticatedCustomerOnApiV1Path_Returns200() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        AssistantChatResponse response = new AssistantChatResponse(
                "Delivery fees depend on distance, weight, and parcel size.",
                "assistant",
                "conv-2",
                "2026-11-21T18:45:00"
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(customer))).thenReturn(response);

        String payload = """
                {
                  "message": "How are delivery fees calculated?",
                  "conversationId": "conv-2",
                  "history": [
                    { "role": "user", "content": "Hi" },
                    { "role": "assistant", "content": "Hello! How can I help?" }
                  ]
                }
                """;

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(response.getReply()))
                .andExpect(jsonPath("$.conversationId").value("conv-2"));
    }

    @Test
    void chat_PriceEstimateRequestAsAuthenticatedCustomer_Returns200WithFeeEstimateCategory() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        AssistantChatResponse response = new AssistantChatResponse(
                "The estimated delivery fee from Colombo to Kandy for 2 kg is LKR 6,959.25.",
                "fee_estimate",
                "conv-fee-1",
                "2026-11-22T00:50:00"
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(customer))).thenReturn(response);

        String payload = """
                {
                  "message": "How much would it cost to send a 2 kg parcel from Colombo to Kandy?",
                  "conversationId": "conv-fee-1"
                }
                """;

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(response.getReply()))
                .andExpect(jsonPath("$.category").value("fee_estimate"))
                .andExpect(jsonPath("$.conversationId").value("conv-fee-1"));
    }

    @Test
    void chat_ParcelTrackingRequestAsAuthenticatedCustomer_Returns200WithTrackingCodeCategory() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        AssistantChatResponse response = new AssistantChatResponse(
                "Parcel SD-91001 is currently In Transit at Kegalle Hub.",
                "tracking_code",
                "conv-track-1",
                "2026-11-22T01:25:00"
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(customer))).thenReturn(response);

        String payload = """
                {
                  "message": "Where is parcel SD-91001?",
                  "conversationId": "conv-track-1"
                }
                """;

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").value(response.getReply()))
                .andExpect(jsonPath("$.category").value("tracking_code"))
                .andExpect(jsonPath("$.conversationId").value("conv-track-1"));
    }

    @Test
    void chat_BlankMessage_Returns400BadRequest() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        String payload = """
                {
                  "message": "   ",
                  "conversationId": "conv-1"
                }
                """;

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.message").exists());
    }

    @Test
    void chat_MessageExceedingMaxLength_Returns400BadRequest() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );
        String tooLong = "x".repeat(1001);
        String payload = "{\"message\":\"" + tooLong + "\"}";

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.message").exists());
    }

    @Test
    void chat_MalformedJson_Returns400BadRequest() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void chat_WithoutAuthentication_Returns401Unauthorized() throws Exception {
        String payload = "{\"message\":\"Where is my parcel?\"}";

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .header("X-User-Id", "spoofed-customer")
                        .header("X-User-Roles", "CUSTOMER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void chat_NonCustomerRole_Returns403Forbidden() throws Exception {
        OrderUserPrincipal dispatcher = new OrderUserPrincipal(
                "disp-1", "disp@swiftdrop.lk", null, List.of("DISPATCHER"), 1L
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(dispatcher)))
                .thenThrow(new AccessDeniedException("SwiftDrop AI is available exclusively to authenticated customers"));

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(dispatcher)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Hello\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void chat_RateLimitExceeded_Returns429TooManyRequests() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(customer)))
                .thenThrow(new AiAssistantException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "You have sent too many messages in a short time. Please wait a moment and try again."
                ));

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Hello\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void chat_WhenAiUnavailableOrTimesOut_Returns503WithSafeMessage() throws Exception {
        OrderUserPrincipal customer = new OrderUserPrincipal(
                "cust-1", "kasun@swiftdrop.lk", null, List.of("CUSTOMER")
        );

        when(assistantService.chat(any(AssistantChatRequest.class), eq(customer)))
                .thenThrow(new AiAssistantException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        RestLlmClient.SAFE_UNAVAILABLE_MESSAGE
                ));

        mockMvc.perform(post("/api/v1/orders/assistant/chat")
                        .with(authentication(authToken(customer)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Hello\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE))
                .andExpect(jsonPath("$.message", not(containsString("Exception"))));
    }
}

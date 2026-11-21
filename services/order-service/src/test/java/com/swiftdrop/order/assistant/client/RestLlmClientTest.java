package com.swiftdrop.order.assistant.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.config.AiAssistantProperties;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RestLlmClientTest {

    private AiAssistantProperties properties;
    private MockRestServiceServer mockServer;
    private RestLlmClient client;

    @BeforeEach
    void setUp() {
        properties = new AiAssistantProperties();
        properties.setEnabled(true);
        properties.setProvider("openai");
        properties.setModel("gpt-4o-mini");
        properties.setApiKey("sk-test-secret-key");
        properties.setBaseUrl("https://api.openai.com");

        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new RestLlmClient(builder, properties, new ObjectMapper());
    }

    @Test
    void generateReply_ValidResponse_ReturnsTrimmedAssistantContent() {
        String providerJson = """
                {
                  "id": "chatcmpl-123",
                  "choices": [
                    {
                      "index": 0,
                      "message": {
                        "role": "assistant",
                        "content": "  Please enter your tracking number on the Track Parcel page.  "
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sk-test-secret-key"))
                .andExpect(jsonPath("$.model").value("gpt-4o-mini"))
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[0].content").value("System prompt"))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andExpect(jsonPath("$.messages[1].content").value("Hi"))
                .andExpect(jsonPath("$.messages[2].role").value("user"))
                .andExpect(jsonPath("$.messages[2].content").value("How do I track?"))
                .andRespond(withSuccess(providerJson, MediaType.APPLICATION_JSON));

        String reply = client.generateReply(
                "System prompt",
                List.of(new LlmMessage("user", "Hi")),
                "How do I track?"
        );

        assertThat(reply).isEqualTo("Please enter your tracking number on the Track Parcel page.");
        mockServer.verify();
    }

    @Test
    void generateReply_ProviderTimeout_Throws503WithSafeMessage() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out", new SocketTimeoutException("Read timed out"));
                });

        assertThatThrownBy(() -> client.generateReply("System prompt", List.of(), "Hello"))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> {
                    AiAssistantException aiEx = (AiAssistantException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).isEqualTo(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
                });

        mockServer.verify();
    }

    @Test
    void generateReply_ProviderErrorResponse_DoesNotLeakSensitiveProviderBody() {
        String sensitiveProviderError = """
                {
                  "error": {
                    "message": "Incorrect API key provided: sk-test-secret-key",
                    "type": "invalid_request_error"
                  }
                }
                """;

        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(sensitiveProviderError));

        assertThatThrownBy(() -> client.generateReply("System prompt", List.of(), "Hello"))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> {
                    AiAssistantException aiEx = (AiAssistantException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).isEqualTo(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
                    assertThat(aiEx.getMessage()).doesNotContain("sk-test");
                });

        mockServer.verify();
    }

    @Test
    void generateReply_MissingConfiguration_Throws503WithoutCallingProvider() {
        properties.setApiKey("");

        assertThatThrownBy(() -> client.generateReply("System prompt", List.of(), "Hello"))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> assertThat(((AiAssistantException) ex).getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));

        mockServer.verify();
    }

    @Test
    void generateReply_MalformedProviderResponse_Throws503WithSafeMessage() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"choices\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.generateReply("System prompt", List.of(), "Hello"))
                .isInstanceOf(AiAssistantException.class)
                .satisfies(ex -> {
                    AiAssistantException aiEx = (AiAssistantException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).isEqualTo(RestLlmClient.SAFE_UNAVAILABLE_MESSAGE);
                });

        mockServer.verify();
    }
}

package com.swiftdrop.order.assistant.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
import com.swiftdrop.order.assistant.client.LlmClient.LlmToolDefinition;
import com.swiftdrop.order.assistant.config.AiAssistantProperties;
import com.swiftdrop.order.assistant.exception.AiAssistantException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.DefaultBootstrapContext;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

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
        properties.setProvider("gemini");
        properties.setModel("gemini-3.5-flash-lite");
        properties.setApiKey("sk-test-secret-key");
        properties.setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai");

        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new RestLlmClient(builder, properties, new ObjectMapper());
    }

    @Test
    void generateReply_ValidResponse_ReturnsTrimmedAssistantContent() {
        String providerJson = """
                {
                  "id": "T-IBa-_ME__e694Ptdq9yA4",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "stop",
                      "message": {
                        "role": "assistant",
                        "content": "  Please enter your tracking number on the Track Parcel page.  ",
                        "extra_content": {
                          "google": {
                            "thought_signature": "sample-signature"
                          }
                        }
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer sk-test-secret-key"))
                .andExpect(jsonPath("$.model").value("gemini-3.5-flash-lite"))
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
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out", new SocketTimeoutException("Read timed out"));
                });
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
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
    void generateReply_TransientTimeoutFollowedBySuccess_RetriesOnceAndReturnsReply() {
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out", new SocketTimeoutException("Read timed out"));
                });
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Hello! How can I assist you?\"}}]}",
                        MediaType.APPLICATION_JSON
                ));

        String reply = client.generateReply("System prompt", List.of(), "Hello");
        assertThat(reply).isEqualTo("Hello! How can I assist you?");
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

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
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
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
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

    @Test
    void generateReply_OpenAiCompatibleVersionedBaseUrls_ResolvesChatCompletionsPath() {
        for (String baseUrl : List.of(
                "https://generativelanguage.googleapis.com/v1beta/openai",
                "https://generativelanguage.googleapis.com/v1beta/openai/",
                "https://api.groq.com/openai/v1",
                "https://custom.example.com/openai"
        )) {
            AiAssistantProperties customProps = new AiAssistantProperties();
            customProps.setEnabled(true);
            customProps.setProvider("gemini");
            customProps.setModel("gemini-3.5-flash-lite");
            customProps.setApiKey("test-provider-key");
            customProps.setBaseUrl(baseUrl);

            RestClient.Builder builder = RestClient.builder();
            MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
            RestLlmClient customClient = new RestLlmClient(builder, customProps, new ObjectMapper());

            String expectedUrl = baseUrl.replaceAll("/+$", "") + "/chat/completions";
            server.expect(requestTo(expectedUrl))
                    .andExpect(method(HttpMethod.POST))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-provider-key"))
                    .andRespond(withSuccess(
                            "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"Ready to help!\"}}]}",
                            MediaType.APPLICATION_JSON
                    ));

            String reply = customClient.generateReply("System", List.of(), "Hello");
            assertThat(reply).isEqualTo("Ready to help!");
            server.verify();
        }
    }

    @Test
    void applicationConfig_LoadsDotEnvPropertiesAndBindsAiConfiguration(@TempDir Path tempDir) throws IOException {
        Path sharedDevEnv = tempDir.resolve("shared-dev.env");
        Files.writeString(sharedDevEnv, """
                SWIFTDROP_AI_ENABLED=true
                SWIFTDROP_AI_PROVIDER=openai
                SWIFTDROP_AI_MODEL=gpt-4o-mini
                SWIFTDROP_AI_BASE_URL=https://api.openai.com
                SWIFTDROP_AI_API_KEY=
                """);

        Path serviceLocalEnv = tempDir.resolve("service-local.env");
        Files.writeString(serviceLocalEnv, """
                SWIFTDROP_AI_ENABLED=true
                SWIFTDROP_AI_PROVIDER=gemini
                SWIFTDROP_AI_MODEL=gemini-3.5-flash-lite
                SWIFTDROP_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
                SWIFTDROP_AI_API_KEY=test-dotenv-key
                """);

        String sharedPath = "optional:file:" + sharedDevEnv.toAbsolutePath().toString().replace("\\", "/") + "[.properties]";
        String localPath = "optional:file:" + serviceLocalEnv.toAbsolutePath().toString().replace("\\", "/") + "[.properties]";

        MockEnvironment env = new MockEnvironment();
        env.setProperty("spring.config.import", sharedPath + "," + localPath);

        ConfigDataEnvironmentPostProcessor.applyTo(
                env,
                new DefaultResourceLoader(),
                new DefaultBootstrapContext()
        );

        AiAssistantProperties bound = Binder.get(env)
                .bindOrCreate("swiftdrop.ai", AiAssistantProperties.class);

        assertThat(bound.isEnabled()).isTrue();
        assertThat(bound.isConfigured()).isTrue();
        assertThat(bound.getProvider()).isEqualTo("gemini");
        assertThat(bound.getModel()).isEqualTo("gemini-3.5-flash-lite");
        assertThat(bound.getBaseUrl()).isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(bound.getApiKey()).isEqualTo("test-dotenv-key");
    }

    @Test
    void generateReply_GeminiToolCallingHandshake_PreservesThoughtSignatureAndReturnsFinalReply() {
        String turn1ToolCallResponse = """
                {
                  "id": "turn-1",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "tool_calls",
                      "message": {
                        "role": "assistant",
                        "tool_calls": [
                          {
                            "id": "call_12345",
                            "type": "function",
                            "extra_content": {
                              "google": {
                                "thought_signature": "sig-abc-123"
                              }
                            },
                            "function": {
                              "name": "estimate_delivery_price",
                              "arguments": "{\\"pickupLocation\\":\\"Colombo\\",\\"destinationLocation\\":\\"Kandy\\",\\"weightKg\\":2}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        String turn2FinalResponse = """
                {
                  "id": "turn-2",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "stop",
                      "message": {
                        "role": "assistant",
                        "content": "The estimated delivery fee from Colombo to Kandy for a 2 kg parcel is LKR 6,952.10."
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.tools[0].function.name").value("estimate_delivery_price"))
                .andExpect(jsonPath("$.tool_choice").value("auto"))
                .andRespond(withSuccess(turn1ToolCallResponse, MediaType.APPLICATION_JSON));

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.messages[2].tool_calls[0].extra_content.google.thought_signature").value("sig-abc-123"))
                .andExpect(jsonPath("$.messages[3].role").value("tool"))
                .andExpect(jsonPath("$.messages[3].tool_call_id").value("call_12345"))
                .andExpect(jsonPath("$.messages[3].name").value("estimate_delivery_price"))
                .andRespond(withSuccess(turn2FinalResponse, MediaType.APPLICATION_JSON));

        LlmToolDefinition toolDef = new LlmToolDefinition(
                "estimate_delivery_price",
                "Calculate delivery price",
                java.util.Map.of("type", "object")
        );

        String reply = client.generateReply(
                "System prompt",
                List.of(),
                "How much to send a 2 kg parcel from Colombo to Kandy?",
                List.of(toolDef),
                call -> {
                    assertThat(call.id()).isEqualTo("call_12345");
                    assertThat(call.name()).isEqualTo("estimate_delivery_price");
                    assertThat(call.argumentsJson()).contains("Kandy");
                    return "{\"status\":\"SUCCESS\",\"totalFee\":6952.10,\"currency\":\"LKR\"}";
                }
        );

        assertThat(reply).contains("LKR 6,952.10");
        mockServer.verify();
    }

    @Test
    void generateReply_DuplicateToolCallWithinSameTurn_ExecutesToolOnceAndReusesResult() {
        String duplicateCallBody = """
                {
                  "id": "dup-turn-1",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "tool_calls",
                      "message": {
                        "role": "assistant",
                        "tool_calls": [
                          {
                            "id": "call_dup_1",
                            "type": "function",
                            "function": {
                              "name": "estimate_delivery_price",
                              "arguments": "{\\"pickupLocation\\":\\"Colombo\\",\\"destinationLocation\\":\\"Kandy\\",\\"weightKg\\":2}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        String duplicateCallBodyRound2 = """
                {
                  "id": "dup-turn-2",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "tool_calls",
                      "message": {
                        "role": "assistant",
                        "tool_calls": [
                          {
                            "id": "call_dup_2",
                            "type": "function",
                            "function": {
                              "name": "estimate_delivery_price",
                              "arguments": "{\\"pickupLocation\\":\\"Colombo\\",\\"destinationLocation\\":\\"Kandy\\",\\"weightKg\\":2}"
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
                """;

        String finalBody = """
                {
                  "id": "dup-turn-3",
                  "model": "gemini-3.5-flash-lite",
                  "choices": [
                    {
                      "index": 0,
                      "finish_reason": "stop",
                      "message": {
                        "role": "assistant",
                        "content": "The delivery fee is LKR 6,952.10."
                      }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(duplicateCallBody, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(duplicateCallBodyRound2, MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(finalBody, MediaType.APPLICATION_JSON));

        AtomicInteger executionCount = new AtomicInteger(0);
        LlmToolDefinition toolDef = new LlmToolDefinition(
                "estimate_delivery_price",
                "Calculate delivery price",
                java.util.Map.of("type", "object")
        );

        String reply = client.generateReply(
                "System prompt",
                List.of(),
                "How much from Colombo to Kandy 2kg?",
                List.of(toolDef),
                call -> {
                    executionCount.incrementAndGet();
                    return "{\"status\":\"SUCCESS\",\"totalFee\":6952.10,\"currency\":\"LKR\"}";
                }
        );

        assertThat(reply).contains("LKR 6,952.10");
        assertThat(executionCount.get()).isEqualTo(1);
        mockServer.verify();
    }
}

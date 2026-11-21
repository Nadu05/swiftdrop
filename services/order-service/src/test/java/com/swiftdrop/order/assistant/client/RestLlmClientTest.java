package com.swiftdrop.order.assistant.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftdrop.order.assistant.client.LlmClient.LlmMessage;
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
            customProps.setModel("gemini-2.0-flash");
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
                SWIFTDROP_AI_MODEL=gemini-2.0-flash
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
        assertThat(bound.getModel()).isEqualTo("gemini-2.0-flash");
        assertThat(bound.getBaseUrl()).isEqualTo("https://generativelanguage.googleapis.com/v1beta/openai");
        assertThat(bound.getApiKey()).isEqualTo("test-dotenv-key");
    }
}

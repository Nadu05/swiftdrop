package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.service.DispatchQueryService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The Dispatch service's shared-key access to GET /orders/ready-for-dispatch, with a key configured. */
@WebMvcTest(DispatchOrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET,
        "swiftdrop.security.service-api-key=" + DispatchServiceKeyTest.KEY
})
class DispatchServiceKeyTest {

    static final String KEY = "dispatch-service-key-0123456789-abcdefghij";

    @Autowired private MockMvc mvc;
    @MockBean private DispatchQueryService dispatchQuery;

    @Test
    @DisplayName("the Dispatch service can read the list with the key and no token, on both paths")
    void validKey() throws Exception {
        when(dispatchQuery.readyForDispatch(any(), any())).thenReturn(List.of());

        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/orders/ready-for-dispatch?branchId=3&limit=5").header("X-Service-Key", KEY))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a wrong, empty or almost-right key is 401")
    void wrongKey() throws Exception {
        for (String key : List.of("wrong", "", " ", KEY + "x", KEY.substring(1), KEY.toUpperCase())) {
            mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", key))
                    .andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(dispatchQuery);
    }

    @Test
    @DisplayName("no key and no token is still 401")
    void noCredentials() throws Exception {
        mvc.perform(get("/api/v1/orders/ready-for-dispatch")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a customer token is still refused, and having the key as well does not break a staff token")
    void tokensStillWork() throws Exception {
        when(dispatchQuery.readyForDispatch(any(), any())).thenReturn(List.of());

        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("Authorization", "Bearer " + TestTokens.customer(42)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("Authorization", "Bearer " + TestTokens.withRole(5, "ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("the key only works for GET: it cannot be used with other methods on that path")
    void onlyGet() throws Exception {
        mvc.perform(post("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", KEY))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(dispatchQuery);
    }
}

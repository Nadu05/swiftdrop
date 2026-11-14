package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.location.CityDirectory;
import com.swiftdrop.order.pricing.PricingService;
import com.swiftdrop.order.security.CustomerIdResolver;
import com.swiftdrop.order.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Client mistakes that Spring itself detects (unknown path, wrong method, wrong content type) must keep
 * their proper 4xx status instead of being reported as a 500 by the catch-all handler.
 */
@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class, CustomerIdResolver.class, CityDirectory.class})
@TestPropertySource(properties = "swiftdrop.security.enabled=false")
class FrameworkErrorMappingTest {

    @Autowired private MockMvc mvc;
    @MockBean private OrderService orderService;
    @MockBean private PricingService pricingService;

    @Test
    @DisplayName("GET on a path that has no handler is 404, not 500")
    void unknownPathIsNotFound() throws Exception {
        mvc.perform(get("/api/v1/orders/does/not/exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("an HTTP method the path does not support is 405, not 500")
    void unsupportedMethodIsMethodNotAllowed() throws Exception {
        mvc.perform(delete("/api/v1/orders"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
        mvc.perform(delete("/api/v1/orders/1"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("a body that is not JSON (wrong or missing Content-Type) is 415, not 500")
    void wrongContentTypeIsUnsupportedMediaType() throws Exception {
        mvc.perform(post("/api/v1/orders").contentType(MediaType.TEXT_PLAIN).content("hello"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    @DisplayName("a non-numeric order id in the path is 400, not 500")
    void nonNumericIdIsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/orders/abc")).andExpect(status().isBadRequest());
    }
}

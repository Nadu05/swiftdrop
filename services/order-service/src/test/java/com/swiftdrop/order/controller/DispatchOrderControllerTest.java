package com.swiftdrop.order.controller;

import com.swiftdrop.order.config.JacksonConfig;
import com.swiftdrop.order.config.SecurityConfig;
import com.swiftdrop.order.dto.ReadyForDispatchResponse;
import com.swiftdrop.order.service.DispatchQueryService;
import com.swiftdrop.order.support.TestTokens;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DispatchOrderController.class)
@Import({SecurityConfig.class, JacksonConfig.class})
@TestPropertySource(properties = {
        "swiftdrop.security.enabled=true",
        "swiftdrop.security.jwt-secret=" + TestTokens.SECRET
})
class DispatchOrderControllerTest {

    @Autowired private MockMvc mvc;
    @MockBean private DispatchQueryService dispatchQuery;

    private static ReadyForDispatchResponse sample() {
        return new ReadyForDispatchResponse(7L, "SD-261113-AAAA2222", "SD-261113-AAAA2222", 3L, "Ayesha Perera",
                "0718849201", "12/4 Peradeniya Road, Kandy", "Kandy", "Nuwan Pradeep", "+94771234567", "STANDARD",
                "MEDIUM", 1.5, null, "Call on arrival", LocalDateTime.of(2026, 11, 13, 8, 30),
                "45 Galle Road, Colombo 03", "Colombo");
    }

    @ParameterizedTest
    @ValueSource(strings = {"DISPATCHER", "BRANCH_ADMIN", "ADMIN"})
    @DisplayName("dispatch and staff roles get exactly the fields Dispatch's OrderDetailsDto reads")
    void authorisedRoles(String role) throws Exception {
        when(dispatchQuery.readyForDispatch(any(), any())).thenReturn(List.of(sample()));

        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("Authorization", "Bearer " + TestTokens.withRole(5, role)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].orderNumber").value("SD-261113-AAAA2222"))
                .andExpect(jsonPath("$[0].trackingNumber").value("SD-261113-AAAA2222"))
                .andExpect(jsonPath("$[0].branchId").value(3))
                .andExpect(jsonPath("$[0].recipientName").value("Ayesha Perera"))
                .andExpect(jsonPath("$[0].recipientPhone").value("0718849201"))
                .andExpect(jsonPath("$[0].deliveryAddress").value("12/4 Peradeniya Road, Kandy"))
                .andExpect(jsonPath("$[0].city").value("Kandy"))
                .andExpect(jsonPath("$[0].merchantName").value("Nuwan Pradeep"))
                .andExpect(jsonPath("$[0].merchantContact").value("+94771234567"))
                .andExpect(jsonPath("$[0].priority").value("STANDARD"))
                .andExpect(jsonPath("$[0].packageType").value("MEDIUM"))
                .andExpect(jsonPath("$[0].weightKg").value(1.5))
                .andExpect(jsonPath("$[0].handlingNotes").value("Call on arrival"))
                // a LocalDateTime without a zone, as Dispatch's DTO expects
                .andExpect(jsonPath("$[0].createdAt").value("2026-11-13T08:30:00"))
                // extra fields so a courier can see where to collect the parcel
                .andExpect(jsonPath("$[0].pickupAddress").value("45 Galle Road, Colombo 03"))
                .andExpect(jsonPath("$[0].pickupCity").value("Colombo"))
                .andExpect(jsonPath("$[0].customerId").doesNotExist());
    }

    @Test
    @DisplayName("also reachable at the gateway-stripped path, and the filters are passed on")
    void gatewayPathAndFilters() throws Exception {
        when(dispatchQuery.readyForDispatch(3L, 10)).thenReturn(List.of());

        mvc.perform(get("/orders/ready-for-dispatch?branchId=3&limit=10")
                        .header("Authorization", "Bearer " + TestTokens.withRole(5, "DISPATCHER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        verify(dispatchQuery).readyForDispatch(3L, 10);
    }

    @Test
    @DisplayName("the filters are optional")
    void optionalFilters() throws Exception {
        when(dispatchQuery.readyForDispatch(any(), any())).thenReturn(List.of());

        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("Authorization", "Bearer " + TestTokens.withRole(5, "ADMIN")))
                .andExpect(status().isOk());
        verify(dispatchQuery).readyForDispatch(isNull(), isNull());
    }

    @Test
    @DisplayName("customers, couriers, unknown roles and anonymous callers cannot read it")
    void refusedCallers() throws Exception {
        mvc.perform(get("/api/v1/orders/ready-for-dispatch")).andExpect(status().isUnauthorized());
        for (String role : List.of("CUSTOMER", "COURIER", "MERCHANT")) {
            mvc.perform(get("/api/v1/orders/ready-for-dispatch")
                            .header("Authorization", "Bearer " + TestTokens.withRole(5, role)))
                    .andExpect(status().isForbidden());
        }
        verifyNoInteractions(dispatchQuery);
    }

    @ParameterizedTest
    @ValueSource(strings = {"limit=0", "limit=-1", "limit=201", "limit=abc", "branchId=0", "branchId=-4", "branchId=x"})
    @DisplayName("an invalid limit or branchId is a 400")
    void invalidParameters(String query) throws Exception {
        mvc.perform(get("/api/v1/orders/ready-for-dispatch?" + query)
                        .header("Authorization", "Bearer " + TestTokens.withRole(5, "ADMIN")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(dispatchQuery);
    }

    @Test
    @DisplayName("with no service key configured the X-Service-Key header is ignored (feature off)")
    void serviceKeyIgnoredWhenNotConfigured() throws Exception {
        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", "anything-at-all-anything-at-all-123"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders/ready-for-dispatch").header("X-Service-Key", ""))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(dispatchQuery);
    }
}

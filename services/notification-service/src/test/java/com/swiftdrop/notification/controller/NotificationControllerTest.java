package com.swiftdrop.notification.controller;

import com.swiftdrop.notification.config.SecurityConfig;
import com.swiftdrop.notification.dto.NotificationDto;
import com.swiftdrop.notification.dto.PublicTrackingNotificationDto;
import com.swiftdrop.notification.security.NotificationJwtAuthenticationFilter;
import com.swiftdrop.notification.security.NotificationJwtService;
import com.swiftdrop.notification.security.NotificationUserPrincipal;
import com.swiftdrop.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
@Import({SecurityConfig.class, NotificationJwtAuthenticationFilter.class, NotificationJwtService.class})
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NotificationService notificationService;

    private UsernamePasswordAuthenticationToken auth(String userId, String role) {
        NotificationUserPrincipal principal = new NotificationUserPrincipal(userId, userId + "@swiftdrop.lk", List.of(role));
        return new UsernamePasswordAuthenticationToken(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private NotificationDto sampleDto() {
        return new NotificationDto(
                1L, "NTF-100001", "evt-1", "OrderConfirmed", "ORDER_CONFIRMED", "EMAIL",
                "usr-1", "customer@swiftdrop.lk", "Kamal", "SD-10101", "101", null,
                "Order SD-10101 confirmed", "Your order is confirmed", "corr-1",
                "SENT", 1, null, null, LocalDateTime.now(), LocalDateTime.now()
        );
    }

    private PublicTrackingNotificationDto samplePublicDto() {
        return new PublicTrackingNotificationDto(
                "SD-10101", "OrderConfirmed", "ORDER_CONFIRMED", "EMAIL",
                "Order SD-10101 confirmed", "SENT", LocalDateTime.now(), LocalDateTime.now()
        );
    }

    @Test
    void listNotifications_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void listNotifications_SpoofedXUserHeadersWithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/notifications")
                        .header("X-User-Id", "usr-1")
                        .header("X-User-Email", "admin@swiftdrop.lk")
                        .header("X-User-Roles", "ADMIN"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void listNotifications_AsCustomer_AndViaGatewayStrippedPath_Returns200() throws Exception {
        when(notificationService.listNotifications(any(), any(), any())).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get("/api/v1/notifications").with(authentication(auth("usr-1", "CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].notificationCode").value("NTF-100001"));

        mockMvc.perform(get("/me").with(authentication(auth("usr-1", "CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].trackingNumber").value("SD-10101"));
    }

    @Test
    void publicTrackingNotifications_PermittedWithoutAuthAndDoesNotExposePiiFields() throws Exception {
        when(notificationService.getPublicTrackingNotifications("SD-10101")).thenReturn(List.of(samplePublicDto()));

        mockMvc.perform(get("/tracking/SD-10101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].notificationType").value("ORDER_CONFIRMED"))
                .andExpect(jsonPath("$[0].deliveryStatus").value("SENT"))
                .andExpect(jsonPath("$[0].recipientName").doesNotExist())
                .andExpect(jsonPath("$[0].recipientEmail").doesNotExist())
                .andExpect(jsonPath("$[0].message").doesNotExist());
    }

    @Test
    void retryFailed_AsCustomer_Returns403() throws Exception {
        when(notificationService.retryFailedNotifications(any()))
                .thenThrow(new AccessDeniedException("Only ADMIN or DISPATCHER roles can retry failed notifications"));

        mockMvc.perform(post("/api/v1/notifications/retry-failed").with(authentication(auth("usr-1", "CUSTOMER"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void markAsRead_AsOwner_ReturnsUpdatedDto() throws Exception {
        when(notificationService.markAsRead(eq("NTF-100001"), any())).thenReturn(sampleDto());

        mockMvc.perform(patch("/api/v1/notifications/NTF-100001/read").with(authentication(auth("usr-1", "CUSTOMER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notificationCode").value("NTF-100001"));
    }
}


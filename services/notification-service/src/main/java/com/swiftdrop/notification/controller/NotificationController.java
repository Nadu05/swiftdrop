package com.swiftdrop.notification.controller;

import com.swiftdrop.notification.dto.NotificationDto;
import com.swiftdrop.notification.dto.PublicTrackingNotificationDto;
import com.swiftdrop.notification.security.NotificationUserPrincipal;
import com.swiftdrop.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/notifications", ""})
@Tag(name = "Notifications", description = "Customer, merchant, and operational notifications management")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @Operation(summary = "List notifications scoped by caller role or tracking number")
    public ResponseEntity<List<NotificationDto>> listNotifications(
            @RequestParam(required = false) String trackingNumber,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal NotificationUserPrincipal principal) {
        return ResponseEntity.ok(notificationService.listNotifications(principal, trackingNumber, status));
    }

    @GetMapping("/me")
    @Operation(summary = "List notifications for the currently authenticated user")
    public ResponseEntity<List<NotificationDto>> myNotifications(
            @RequestParam(required = false) String trackingNumber,
            @AuthenticationPrincipal NotificationUserPrincipal principal) {
        return ResponseEntity.ok(notificationService.listNotifications(principal, trackingNumber, null));
    }

    @GetMapping("/tracking/{trackingNumber}")
    @Operation(summary = "Retrieve sanitized public milestone notifications for a tracking number")
    public ResponseEntity<List<PublicTrackingNotificationDto>> getPublicTrackingNotifications(
            @PathVariable String trackingNumber) {
        return ResponseEntity.ok(notificationService.getPublicTrackingNotifications(trackingNumber));
    }

    @PatchMapping("/{idOrCode}/read")
    @Operation(summary = "Mark a notification as read")
    public ResponseEntity<NotificationDto> markAsRead(
            @PathVariable String idOrCode,
            @AuthenticationPrincipal NotificationUserPrincipal principal) {
        return ResponseEntity.ok(notificationService.markAsRead(idOrCode, principal));
    }

    @PostMapping("/retry-failed")
    @Operation(summary = "Retry FAILED notification deliveries (ADMIN or DISPATCHER)")
    public ResponseEntity<List<NotificationDto>> retryFailed(
            @AuthenticationPrincipal NotificationUserPrincipal principal) {
        return ResponseEntity.ok(notificationService.retryFailedNotifications(principal));
    }
}


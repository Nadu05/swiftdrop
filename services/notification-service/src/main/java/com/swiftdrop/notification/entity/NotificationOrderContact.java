package com.swiftdrop.notification.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_order_contacts")
public class NotificationOrderContact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", length = 64)
    private String orderId;

    @Column(name = "tracking_number", nullable = false, unique = true, length = 40)
    private String trackingNumber;

    @Column(name = "customer_user_id", length = 100)
    private String customerUserId;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Column(name = "sender_name", length = 200)
    private String senderName;

    @Column(name = "sender_email", length = 255)
    private String senderEmail;

    @Column(name = "recipient_name", length = 200)
    private String recipientName;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Column(name = "origin_branch_name", length = 200)
    private String originBranchName;

    @Column(name = "destination_branch_name", length = 200)
    private String destinationBranchName;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public NotificationOrderContact() {
    }

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }

    public String getCustomerUserId() { return customerUserId; }
    public void setCustomerUserId(String customerUserId) { this.customerUserId = customerUserId; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getSenderEmail() { return senderEmail; }
    public void setSenderEmail(String senderEmail) { this.senderEmail = senderEmail; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getOriginBranchName() { return originBranchName; }
    public void setOriginBranchName(String originBranchName) { this.originBranchName = originBranchName; }

    public String getDestinationBranchName() { return destinationBranchName; }
    public void setDestinationBranchName(String destinationBranchName) { this.destinationBranchName = destinationBranchName; }
}


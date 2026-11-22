package com.swiftdrop.notification.service;

import com.swiftdrop.notification.entity.NotificationEntity;
import com.swiftdrop.notification.exception.NotificationDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * SMTP email delivery adapter using Spring Boot's {@link JavaMailSender}.
 * Enabled when {@code app.mail.enabled=true}; otherwise {@link LoggingNotificationSender} is used.
 *
 * <p>Branch Manager credential emails are sent as branded HTML. All other notification types
 * are sent as plain-text emails.</p>
 */
@Component
@ConditionalOnProperty(prefix = "app.mail", name = "enabled", havingValue = "true")
public class SmtpNotificationSender implements NotificationSenderPort {

    private static final Logger log = LoggerFactory.getLogger(SmtpNotificationSender.class);

    /** Notification types that receive a rich HTML email. */
    private static final String TYPE_BRANCH_CREDENTIALS = "BRANCH_MANAGER_CREDENTIALS";
    private static final String TYPE_PASSWORD_RESET = "PASSWORD_RESET";

    private final JavaMailSender mailSender;
    private final String fromAddress;
    @Value("${app.frontend.base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public SmtpNotificationSender(
            JavaMailSender mailSender,
            @Value("${app.mail.from:noreply@swiftdrop.lk}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void send(NotificationEntity notification) {
        String recipient = notification.getRecipientEmail();
        if (recipient == null || recipient.isBlank()) {
            throw new NotificationDeliveryException("Recipient email is required for SMTP delivery");
        }

        try {
            if (TYPE_BRANCH_CREDENTIALS.equals(notification.getNotificationType())) {
                sendHtmlCredentialEmail(notification, recipient.trim());
            } else if (TYPE_PASSWORD_RESET.equals(notification.getNotificationType())) {
                sendHtmlPasswordResetEmail(notification, recipient.trim());
            } else {
                sendPlainTextEmail(notification, recipient.trim());
            }
            log.info("[corr={}] Sent SMTP email [{}] type={} to={}",
                    notification.getCorrelationId(),
                    notification.getNotificationCode(),
                    notification.getNotificationType(),
                    recipient.trim());
        } catch (MailException ex) {
            log.error("[corr={}] Failed to send SMTP email [{}] type={} to={}: {}",
                    notification.getCorrelationId(),
                    notification.getNotificationCode(),
                    notification.getNotificationType(),
                    recipient.trim(), ex.getMessage(), ex);
            throw new NotificationDeliveryException("Email delivery failed due to mail server error: " + ex.getMessage(), ex);
        } catch (MessagingException ex) {
            log.error("[corr={}] Failed to build MIME email [{}] type={} to={}: {}",
                    notification.getCorrelationId(),
                    notification.getNotificationCode(),
                    notification.getNotificationType(),
                    recipient.trim(), ex.getMessage(), ex);
            throw new NotificationDeliveryException("Email build failed: " + ex.getMessage(), ex);
        }
    }

    // ─── Plain-text delivery ───────────────────────────────────────────────────

    private void sendPlainTextEmail(NotificationEntity notification, String recipient) {
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(fromAddress);
        mail.setTo(recipient);
        mail.setSubject(notification.getTitle());
        mail.setText(notification.getMessage());
        mailSender.send(mail);
    }

    // ─── HTML delivery for branch credential emails ────────────────────────────

    private void sendHtmlCredentialEmail(NotificationEntity notification, String recipient)
            throws MessagingException {
        // Parse the plain-text message to extract the structured fields we need.
        // The message format set by NotificationService.sendBranchCredentials() is:
        //   "Your SwiftDrop Branch Manager account for {branch} ({code}) is ready.\n\n
        //    Login Email: {email}\nTemporary Password: {password}\n\n
        //    Please sign in and change your password immediately."
        // We use the plain-text message as the fallback and also display key fields in the HTML body.
        String plainText = notification.getMessage() != null ? notification.getMessage() : "";
        String loginEmail = extractField(plainText, "Login Email:");
        String tempPassword = extractField(plainText, "Temporary Password:");
        String branchInfo = notification.getTitle(); // e.g. "SwiftDrop Branch Manager Credentials - Colombo (CMB)"
        String loginUrl = frontendBaseUrl + "/login";

        String html = buildCredentialEmailHtml(branchInfo, loginEmail, tempPassword, loginUrl);

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(recipient);
        helper.setSubject(notification.getTitle());
        helper.setText(plainText, html);  // plain text + HTML alternative
        mailSender.send(mimeMessage);
    }

    private String extractField(String text, String prefix) {
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith(prefix)) {
                return trimmed.substring(prefix.length()).trim();
            }
        }
        return "";
    }

    // ─── HTML Email Template ───────────────────────────────────────────────────

    private String buildCredentialEmailHtml(
            String branchInfo,
            String loginEmail,
            String tempPassword,
            String loginUrl) {
        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head>" +
                "<meta charset=\"UTF-8\" />" +
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />" +
                "<title>Welcome to SwiftDrop</title>" +
                "<style>" +
                "  body { margin:0; padding:0; background:#f0f3f8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }" +
                "  .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden;" +
                "             box-shadow:0 20px 45px -8px rgba(15,23,42,0.08),0 4px 14px rgba(15,23,42,0.04); }" +
                "  .header  { background:linear-gradient(135deg,#1d68ed 0%,#2563eb 100%); padding:36px 40px; }" +
                "  .header h1 { color:#ffffff; font-size:1.6rem; font-weight:800; margin:0; letter-spacing:-0.02em; }" +
                "  .header p  { color:#bfdbfe; font-size:0.85rem; margin:4px 0 0; }" +
                "  .body    { padding:36px 40px; }" +
                "  .body h2 { color:#0f172a; font-size:1.15rem; font-weight:700; margin:0 0 8px; }" +
                "  .body p  { color:#475569; font-size:0.9rem; line-height:1.6; margin:0 0 20px; }" +
                "  .cred-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;" +
                "              padding:20px 24px; margin:0 0 24px; }" +
                "  .cred-row { display:flex; flex-direction:column; gap:4px; padding:12px 0;" +
                "              border-bottom:1px solid #f1f5f9; }" +
                "  .cred-row:last-child { border-bottom:none; padding-bottom:0; }" +
                "  .cred-label { font-size:0.72rem; font-weight:700; color:#94a3b8;" +
                "                text-transform:uppercase; letter-spacing:0.06em; }" +
                "  .cred-value { font-size:1rem; font-weight:700; color:#0f172a;" +
                "                font-family:ui-monospace,'Cascadia Code','SF Mono',monospace; }" +
                "  .cred-value.email { font-size:0.925rem; color:#2563eb; }" +
                "  .notice { background:#fffbeb; border:1px solid #fde68a; border-radius:10px;" +
                "            padding:14px 18px; margin:0 0 24px; }" +
                "  .notice p { color:#92400e; font-size:0.82rem; margin:0; }" +
                "  .btn { display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none;" +
                "         font-size:0.9rem; font-weight:700; padding:13px 28px; border-radius:9px;" +
                "         box-shadow:0 4px 14px rgba(37,99,235,0.35); }" +
                "  .steps { counter-reset:steps; list-style:none; margin:0 0 24px; padding:0; }" +
                "  .steps li { counter-increment:steps; display:flex; gap:14px; align-items:flex-start;" +
                "              padding:10px 0; border-bottom:1px solid #f1f5f9; }" +
                "  .steps li:last-child { border-bottom:none; }" +
                "  .steps li::before { content:counter(steps); display:flex; align-items:center;" +
                "                      justify-content:center; min-width:26px; height:26px;" +
                "                      border-radius:50%; background:#eff6ff; color:#2563eb;" +
                "                      font-size:0.75rem; font-weight:800; }" +
                "  .steps li span { color:#334155; font-size:0.875rem; line-height:1.5; padding-top:3px; }" +
                "  .footer { background:#f8fafc; padding:24px 40px; text-align:center;" +
                "            border-top:1px solid #e2e8f0; }" +
                "  .footer p { color:#94a3b8; font-size:0.78rem; margin:0; line-height:1.5; }" +
                "  @media (max-width:620px) {" +
                "    .wrapper { margin:16px; border-radius:12px; }" +
                "    .header, .body, .footer { padding:24px 20px; }" +
                "  }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class=\"wrapper\">" +

                "  <div class=\"header\">" +
                "    <h1>Swift<span style=\"color:#93c5fd;\">Drop</span></h1>" +
                "    <p>National Logistics &amp; Delivery Platform</p>" +
                "  </div>" +

                "  <div class=\"body\">" +
                "    <h2>Welcome to SwiftDrop &#127881;</h2>" +
                "    <p>Your <strong>Branch Admin account</strong> has been created for <strong>" + escapeHtml(branchInfo) + "</strong>. " +
                "       Use the credentials below to sign in for the first time.</p>" +

                "    <div class=\"cred-box\">" +
                "      <div class=\"cred-row\">" +
                "        <span class=\"cred-label\">Login Email</span>" +
                "        <span class=\"cred-value email\">" + escapeHtml(loginEmail) + "</span>" +
                "      </div>" +
                "      <div class=\"cred-row\">" +
                "        <span class=\"cred-label\">Temporary Password</span>" +
                "        <span class=\"cred-value\">" + escapeHtml(tempPassword) + "</span>" +
                "      </div>" +
                "    </div>" +

                "    <div class=\"notice\">" +
                "      <p>&#9888;&#65039; <strong>You will be required to change your password</strong> immediately after your first login. " +
                "         Do not share these credentials with anyone.</p>" +
                "    </div>" +

                "    <p><strong>Getting started — follow these steps:</strong></p>" +
                "    <ol class=\"steps\">" +
                "      <li><span>Click <strong>Sign In to SwiftDrop</strong> below and enter your login email and temporary password.</span></li>" +
                "      <li><span>You will be automatically redirected to the <em>Set Your Personal Password</em> page.</span></li>" +
                "      <li><span>Choose a strong new password (minimum 8 characters, uppercase, digit, and special character).</span></li>" +
                "      <li><span>Save your new password — your Branch Admin portal will open immediately.</span></li>" +
                "    </ol>" +

                "    <div style=\"text-align:center; margin:28px 0;\">" +
                "      <a href=\"" + escapeHtml(loginUrl) + "\" class=\"btn\">Sign In to SwiftDrop &rarr;</a>" +
                "    </div>" +

                "    <p style=\"font-size:0.82rem; color:#94a3b8;\">" +
                "      If the button above doesn&apos;t work, copy and paste this link into your browser:<br />" +
                "      <span style=\"color:#2563eb;\">" + escapeHtml(loginUrl) + "</span>" +
                "    </p>" +
                "  </div>" +

                "  <div class=\"footer\">" +
                "    <p>This email was sent by SwiftDrop on behalf of your organisation.<br />" +
                "       If you did not expect this email, please disregard it safely.</p>" +
                "    <p style=\"margin-top:8px;\">&copy; SwiftDrop &mdash; National Logistics &amp; Delivery Platform</p>" +
                "  </div>" +

                "</div>" +
                "</body>" +
                "</html>";
    }

    private void sendHtmlPasswordResetEmail(NotificationEntity notification, String recipient)
            throws MessagingException {
        String plainText = notification.getMessage() != null ? notification.getMessage() : "";
        String resetUrl = extractResetUrl(plainText);

        String html = buildPasswordResetEmailHtml(recipient, resetUrl);

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(recipient);
        helper.setSubject(notification.getTitle() != null ? notification.getTitle() : "SwiftDrop – Password Reset Request");
        helper.setText(plainText, html);
        mailSender.send(mimeMessage);
    }

    private String extractResetUrl(String text) {
        for (String line : text.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                return trimmed;
            }
        }
        return (frontendBaseUrl != null ? frontendBaseUrl : "http://localhost:3000") + "/reset-password";
    }

    private String buildPasswordResetEmailHtml(String recipientEmail, String resetUrl) {
        return "<!DOCTYPE html>" +
                "<html lang=\"en\">" +
                "<head>" +
                "<meta charset=\"UTF-8\" />" +
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />" +
                "<title>Reset Your Password &mdash; SwiftDrop</title>" +
                "<style>" +
                "  body { margin:0; padding:0; background:#f0f3f8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }" +
                "  .wrapper { max-width:580px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden;" +
                "             box-shadow:0 20px 45px -8px rgba(15,23,42,0.08),0 4px 14px rgba(15,23,42,0.04); }" +
                "  .header  { background:linear-gradient(135deg,#1d68ed 0%,#2563eb 100%); padding:32px 36px; }" +
                "  .header h1 { color:#ffffff; font-size:1.5rem; font-weight:800; margin:0; letter-spacing:-0.02em; }" +
                "  .header p  { color:#bfdbfe; font-size:0.825rem; margin:4px 0 0; }" +
                "  .body    { padding:36px; }" +
                "  .body h2 { color:#0f172a; font-size:1.25rem; font-weight:700; margin:0 0 12px; }" +
                "  .body p  { color:#475569; font-size:0.9rem; line-height:1.6; margin:0 0 18px; }" +
                "  .btn-container { text-align:center; margin:28px 0; }" +
                "  .btn { display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none;" +
                "         font-size:0.925rem; font-weight:700; padding:13px 32px; border-radius:9px;" +
                "         box-shadow:0 4px 14px rgba(37,99,235,0.35); }" +
                "  .notice { background:#fef3c7; border:1px solid #fde68a; border-radius:10px;" +
                "            padding:14px 18px; margin:24px 0; }" +
                "  .notice p { color:#92400e; font-size:0.825rem; margin:0; line-height:1.5; }" +
                "  .fallback { font-size:0.8rem; color:#94a3b8; word-break:break-all; line-height:1.5; }" +
                "  .fallback a { color:#2563eb; text-decoration:none; }" +
                "  .footer { background:#f8fafc; padding:24px 36px; text-align:center;" +
                "            border-top:1px solid #e2e8f0; }" +
                "  .footer p { color:#94a3b8; font-size:0.78rem; margin:0; line-height:1.5; }" +
                "  @media (max-width:600px) {" +
                "    .wrapper { margin:16px; border-radius:12px; }" +
                "    .header, .body, .footer { padding:24px 20px; }" +
                "  }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class=\"wrapper\">" +

                "  <div class=\"header\">" +
                "    <h1>Swift<span style=\"color:#93c5fd;\">Drop</span></h1>" +
                "    <p>National Logistics &amp; Delivery Platform</p>" +
                "  </div>" +

                "  <div class=\"body\">" +
                "    <h2>Reset Your Password</h2>" +
                "    <p>Hello,</p>" +
                "    <p>We received a request to reset the password for your SwiftDrop account associated with <strong>" + escapeHtml(recipientEmail) + "</strong>. " +
                "       Click the button below to choose a new password.</p>" +

                "    <div class=\"btn-container\">" +
                "      <a href=\"" + escapeHtml(resetUrl) + "\" class=\"btn\">Reset Password &rarr;</a>" +
                "    </div>" +

                "    <div class=\"notice\">" +
                "      <p>&#9200; <strong>This link is valid for 1 hour.</strong> For your security, the link can only be used once.</p>" +
                "      <p style=\"margin-top:6px;\">&#128274; If you did not request this password reset, please ignore this email. Your current password will remain unchanged.</p>" +
                "    </div>" +

                "    <p class=\"fallback\">" +
                "      If the button above does not work, copy and paste this URL into your browser:<br />" +
                "      <a href=\"" + escapeHtml(resetUrl) + "\">" + escapeHtml(resetUrl) + "</a>" +
                "    </p>" +
                "  </div>" +

                "  <div class=\"footer\">" +
                "    <p>This automated message was sent by SwiftDrop. Please do not reply directly to this email.</p>" +
                "    <p style=\"margin-top:6px;\">&copy; SwiftDrop &mdash; National Logistics &amp; Delivery Platform</p>" +
                "  </div>" +

                "</div>" +
                "</body>" +
                "</html>";
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;")
                   .replace("'", "&#39;");
    }
}

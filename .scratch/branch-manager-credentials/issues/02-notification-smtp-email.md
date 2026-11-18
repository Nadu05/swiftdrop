# 02: SMTP Credential Email Delivery (notification-service & Local Dev)

**What to build:** `notification-service` sends real emails via `spring-boot-starter-mail` (`JavaMailSender`, configured via `SPRING_MAIL_*` env vars, with `LoggingNotificationSender` fallback when mail is disabled), exposes a branch-credential email trigger returning `SENT`/`FAILED` status, and adds Mailpit to local dev `docker-compose`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `notification-service` includes `spring-boot-starter-mail` and an email `NotificationSenderPort` implementation using `JavaMailSender` when mail is enabled, keeping `LoggingNotificationSender` fallback when disabled
- [ ] Expose an internal/API endpoint (and/or domain event handler) to send Branch Manager login credentials (recipient email, branch name/code, login email, temporary password) and report `SENT` or `FAILED` outcome
- [ ] Local dev `docker-compose` includes a Mailpit SMTP container and `SPRING_MAIL_*` configuration for local testing
- [ ] Unit/integration tests verify email recipient, subject, and credential body against a mocked `JavaMailSender`, plus fallback behavior

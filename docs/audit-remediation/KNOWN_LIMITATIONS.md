# SwiftDrop Audit Remediation – Known Limitations & Operational Procedures

## 1. Secret Rotation & Git History Cleanup Procedure (`GAP-SEC-08`)

Because live credentials (Neon PostgreSQL password, JWT secret, RabbitMQ password, and Google OAuth Client ID) were committed in earlier git history inside `infrastructure/dev/.env.example` and `services/identity-service/src/main/resources/application.yml`, removing them from the working tree is necessary but not sufficient for production security:

1. **Immediate Credential Rotation**:
   - **Neon PostgreSQL**: Rotate the `neondb_owner` password in the Neon Console and revoke old connection strings.
   - **JWT Secret**: Generate a new 256-bit+ Base64 secret (`openssl rand -base64 48`) and set `JWT_SECRET` in environment variables across all services.
   - **RabbitMQ**: Rotate `RABBITMQ_DEFAULT_PASS` / `RABBITMQ_PASSWORD` in deployment secrets.
   - **Google OAuth**: Rotate or restrict the OAuth 2.0 Client ID in Google Cloud Console.
2. **Git History Purge**:
   - Run `git filter-repo` (or BFG Repo-Cleaner) to purge historical values from all commits and tags before pushing to any shared remote:
     ```bash
     git filter-repo --replace-text replacements.txt
     git push --force --all
     git push --force --tags
     ```


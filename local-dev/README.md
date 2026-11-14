# SwiftDrop — Local Developer Setup (Docker + Microservices)

This directory contains a complete, turnkey local development environment for SwiftDrop. It allows any developer to launch the core infrastructure (**PostgreSQL 17**, **pgAdmin 4**, and **RabbitMQ 3**) with a single command, without needing cloud credentials (Neon) or external environment variables.

---

## Directory Overview

```text
local-dev/
├── docker-compose.yml          # Self-contained Docker Compose (PostgreSQL, pgAdmin, RabbitMQ)
├── init-scripts/
│   └── 01-init-databases.sql  # Automatically creates all 5 isolated service databases
├── pgadmin/
│   └── servers.json           # Auto-registers PostgreSQL server connection in pgAdmin
├── service-configs/           # Pre-configured application.yml files with hardcoded local credentials
│   ├── api-gateway/
│   │   └── application.yml
│   ├── identity-service/
│   │   └── application.yml
│   ├── organization-service/
│   │   └── application.yml
│   ├── order-service/
│   │   └── application.yml
│   ├── dispatch-service/
│   │   └── application.yml
│   └── notification-service/
│       └── application.yml
└── README.md                  # This setup documentation
```

---

## Quick Start (3 Steps)

### Step 1: Start Docker Infrastructure

From the project root:

```bash
docker compose -f local-dev/docker-compose.yml up -d
```

This starts:
1. **PostgreSQL 17** on port `5432` with databases pre-created:
   - `swiftdrop_identity`
   - `swiftdrop_organization`
   - `swiftdrop_order`
   - `swiftdrop_dispatch`
   - `swiftdrop_notification`
2. **RabbitMQ 3 Management** on port `5672` (AMQP) and `15672` (Web UI).
3. **pgAdmin 4** on port `5050` (Web UI).

Verify containers are running:
```bash
docker compose -f local-dev/docker-compose.yml ps
```

---

### Step 2: Use Local `application.yml` for Any Service

To run any service locally against the Docker containers, copy its corresponding file from `local-dev/service-configs/<service>/application.yml` to the service's `src/main/resources/application.yml`.

#### Windows PowerShell:
```powershell
# Example: Prepare Identity Service for local dev
Copy-Item local-dev/service-configs/identity-service/application.yml services/identity-service/src/main/resources/application.yml

# Example: Prepare Organization Service
Copy-Item local-dev/service-configs/organization-service/application.yml services/organization-service/src/main/resources/application.yml

# Example: Prepare Order Service
Copy-Item local-dev/service-configs/order-service/application.yml services/order-service/src/main/resources/application.yml

# Example: Prepare Dispatch Service
Copy-Item local-dev/service-configs/dispatch-service/application.yml services/dispatch-service/src/main/resources/application.yml

# Example: Prepare Notification Service
Copy-Item local-dev/service-configs/notification-service/application.yml services/notification-service/src/main/resources/application.yml

# Example: Prepare API Gateway
Copy-Item local-dev/service-configs/api-gateway/application.yml api-gateway/src/main/resources/application.yml
```

#### Linux / macOS:
```bash
cp local-dev/service-configs/identity-service/application.yml services/identity-service/src/main/resources/application.yml
cp local-dev/service-configs/organization-service/application.yml services/organization-service/src/main/resources/application.yml
cp local-dev/service-configs/order-service/application.yml services/order-service/src/main/resources/application.yml
cp local-dev/service-configs/dispatch-service/application.yml services/dispatch-service/src/main/resources/application.yml
cp local-dev/service-configs/notification-service/application.yml services/notification-service/src/main/resources/application.yml
cp local-dev/service-configs/api-gateway/application.yml api-gateway/src/main/resources/application.yml
```

> **Alternative (Without Replacing Files)**:  
> You can also run Maven directly pointing to the local config without modifying Git-tracked files:  
> `mvn spring-boot:run -Dspring-boot.run.arguments="--spring.config.location=../../local-dev/service-configs/identity-service/application.yml"`

---

### Step 3: Run the Services

Start the microservices in separate terminal windows:

```bash
# 1. Identity Service (Port 8081)
cd services/identity-service
mvn spring-boot:run

# 2. Organization Service (Port 8082)
cd services/organization-service
mvn spring-boot:run

# 3. Order Service (Port 8083)
cd services/order-service
mvn spring-boot:run

# 4. Dispatch Service (Port 8084)
cd services/dispatch-service
mvn spring-boot:run

# 5. Notification Service (Port 8085)
cd services/notification-service
mvn spring-boot:run

# 6. API Gateway (Port 8080)
cd api-gateway
mvn spring-boot:run

# 7. Next.js Frontend (Port 3000)
cd frontend
npm run dev
```

---

## Infrastructure Credentials & Access URLs

| Service | Protocol / Port | Access URL | Username / Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | TCP `5432` | `localhost:5432` | `postgres` | `postgrespassword` |
| **pgAdmin 4** | HTTP `5050` | [http://localhost:5050](http://localhost:5050) | `admin@swiftdrop.lk` | `admin` |
| **RabbitMQ Web** | HTTP `15672` | [http://localhost:15672](http://localhost:15672) | `swiftdrop` | `password123` |
| **RabbitMQ AMQP** | TCP `5672` | `localhost:5672` | `swiftdrop` | `password123` |
| **API Gateway** | HTTP `8080` | [http://localhost:8080](http://localhost:8080) | — | — |
| **Frontend Web** | HTTP `3000` | [http://localhost:3000](http://localhost:3000) | *(See accounts below)* | *(See accounts below)* |

---

## Pre-Seeded Test Accounts

When `identity-service` starts up against the PostgreSQL database, Flyway migrations and `DefaultAccountsInitializer` ensure the canonical demo accounts are ready immediately:

| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@swiftdrop.lk` | `Admin@123` | System Governance (`/admin`) |
| **Branch Dispatcher** | `dispatcher.colombo@swiftdrop.lk` | `Dispatcher@123` | Dispatcher Command Center (`/dispatcher`) |
| **Fleet Courier** | `courier1@swiftdrop.lk` | `Courier@123` | Courier Portal (`/courier/dashboard`) |
| **Merchant** | `merchant@swiftdrop.lk` | `Merchant@123` | Merchant Portal (`/merchant/dashboard`) |
| **Customer** | `customer@swiftdrop.lk` | `Customer@123` | Customer Portal (`/customer/dashboard`) |

---

## Database Inspection via pgAdmin

1. Open [http://localhost:5050](http://localhost:5050) in your browser.
2. Sign in with:
   - **Email**: `admin@swiftdrop.lk`
   - **Password**: `admin`
3. Expand **Servers** in the left sidebar:
   - The connection `SwiftDrop Local PostgreSQL` is already pre-configured.
   - Enter password `postgrespassword` when prompted.
4. You will see all 5 microservice databases:
   - `swiftdrop_identity`
   - `swiftdrop_organization`
   - `swiftdrop_order`
   - `swiftdrop_dispatch`
   - `swiftdrop_notification`

---

## Troubleshooting

### 1. Port 5432, 5672, or 5050 Already In Use
If another local PostgreSQL or RabbitMQ instance is already running on your machine:
- Check what process is using the port:
  ```powershell
  Get-NetTCPConnection -LocalPort 5432
  ```
- Stop any existing local PostgreSQL Windows service or container before launching `docker-compose.yml`.

### 2. Resetting the Database Completely
To wipe all local tables, data, and Flyway schemas to start completely fresh:
```bash
docker compose -f local-dev/docker-compose.yml down -v
docker compose -f local-dev/docker-compose.yml up -d
```
The `01-init-databases.sql` script will automatically re-run and re-create all empty databases.
When the Spring Boot services start up, Flyway migrations will cleanly rebuild the schemas from scratch.

### 3. Stopping Infrastructure
```bash
docker compose -f local-dev/docker-compose.yml down
```
*(Without `-v`, your database tables and data are safely persisted across restarts).*

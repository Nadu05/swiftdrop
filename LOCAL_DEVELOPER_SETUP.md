# SwiftDrop — Complete Local Developer Setup Guide

This guide provides end-to-end instructions for launching SwiftDrop completely offline/locally using **Docker Compose** (**PostgreSQL 17**, **pgAdmin 4**, and **RabbitMQ 3**) along with hardcoded microservice configurations.

---

## 1. Prerequisites

Before starting, ensure your machine has:
- **Docker Desktop** installed and running (with Linux containers mode).
- **Java 21 JDK** (e.g. Eclipse Temurin or OpenJDK 21).
- **Apache Maven 3.9+** (`mvn -v`).
- **Node.js 18+** & **npm** (`node -v`, `npm -v`).

---

## 2. Infrastructure Architecture & Port Map

The local development infrastructure runs isolated in Docker. All ports and services are mapped as follows:

```
+----------------------------------------------------------------------------+
|                          LOCAL INFRASTRUCTURE                              |
+------------------------+-------------+-------------------------------------+
| Service                | Port        | Access URL / Description            |
+------------------------+-------------+-------------------------------------+
| PostgreSQL 17          | 5432        | localhost:5432 (5 isolated DBs)     |
| pgAdmin 4              | 5050        | http://localhost:5050 (Web GUI)     |
| RabbitMQ Management    | 15672       | http://localhost:15672 (Web GUI)    |
| RabbitMQ AMQP Broker   | 5672        | localhost:5672                      |
+------------------------+-------------+-------------------------------------+
|                          MICROSERVICES & FRONTEND                          |
+------------------------+-------------+-------------------------------------+
| API Gateway            | 8080        | http://localhost:8080               |
| Identity Service       | 8081        | http://localhost:8081               |
| Organization Service   | 8082        | http://localhost:8082               |
| Order Service          | 8083        | http://localhost:8083               |
| Dispatch Service       | 8084        | http://localhost:8084               |
| Notification Service   | 8085        | http://localhost:8085               |
| Next.js Frontend       | 3000        | http://localhost:3000               |
+------------------------+-------------+-------------------------------------+
```

---

## 3. Step 1: Start Docker Infrastructure

Run this command from the repository root:

```bash
docker compose -f local-dev/docker-compose.yml up -d
```

### What happens automatically:
1. **PostgreSQL 17** starts with user `postgres` and password `postgrespassword`.
2. The initialization script (`local-dev/init-scripts/01-init-databases.sql`) automatically creates all 5 databases:
   - `swiftdrop_identity`
   - `swiftdrop_organization`
   - `swiftdrop_order`
   - `swiftdrop_dispatch`
   - `swiftdrop_notification`
3. **pgAdmin 4** starts on `http://localhost:5050` with login `admin@swiftdrop.lk` / `admin`. The PostgreSQL server is automatically pre-registered in the server tree.
4. **RabbitMQ** starts on `http://localhost:15672` with login `swiftdrop` / `password123`.

To verify containers:
```bash
docker compose -f local-dev/docker-compose.yml ps
```

---

## 4. Step 2: Swap Service `application.yml` for Local Testing

A dedicated folder `local-dev/service-configs/` contains pre-configured `application.yml` files for every service with **hardcoded local credentials** (no environment variables or `.env` files required).

The original repository configurations have **not** been modified. When you want to run a specific service against your local Docker setup, copy its respective YAML file:

### Windows PowerShell:
```powershell
# Copy Identity Service config
Copy-Item local-dev/service-configs/identity-service/application.yml services/identity-service/src/main/resources/application.yml

# Copy Organization Service config
Copy-Item local-dev/service-configs/organization-service/application.yml services/organization-service/src/main/resources/application.yml

# Copy Order Service config
Copy-Item local-dev/service-configs/order-service/application.yml services/order-service/src/main/resources/application.yml

# Copy Dispatch Service config
Copy-Item local-dev/service-configs/dispatch-service/application.yml services/dispatch-service/src/main/resources/application.yml

# Copy Notification Service config
Copy-Item local-dev/service-configs/notification-service/application.yml services/notification-service/src/main/resources/application.yml

# Copy API Gateway config
Copy-Item local-dev/service-configs/api-gateway/application.yml api-gateway/src/main/resources/application.yml
```

### Linux / macOS:
```bash
cp local-dev/service-configs/identity-service/application.yml services/identity-service/src/main/resources/application.yml
cp local-dev/service-configs/organization-service/application.yml services/organization-service/src/main/resources/application.yml
cp local-dev/service-configs/order-service/application.yml services/order-service/src/main/resources/application.yml
cp local-dev/service-configs/dispatch-service/application.yml services/dispatch-service/src/main/resources/application.yml
cp local-dev/service-configs/notification-service/application.yml services/notification-service/src/main/resources/application.yml
cp local-dev/service-configs/api-gateway/application.yml api-gateway/src/main/resources/application.yml
```

---

## 5. Step 3: Run the Microservices

Open a new terminal for each service and start them in the recommended order:

### Terminal 1: Identity Service
```bash
cd services/identity-service
mvn spring-boot:run
```
*(Runs Flyway migrations, creates tables in `swiftdrop_identity`, and seeds initial admin/test accounts).*

### Terminal 2: Organization Service
```bash
cd services/organization-service
mvn spring-boot:run
```
*(Runs Flyway migrations and creates tables in `swiftdrop_organization`).*

### Terminal 3: Order Service
```bash
cd services/order-service
mvn spring-boot:run
```
*(Runs Flyway migrations and creates tables in `swiftdrop_order`).*

### Terminal 4: Dispatch Service
```bash
cd services/dispatch-service
mvn spring-boot:run
```
*(Runs Flyway migrations and creates tables in `swiftdrop_dispatch`).*

### Terminal 5: Notification Service
```bash
cd services/notification-service
mvn spring-boot:run
```
*(Runs Flyway migrations and creates tables in `swiftdrop_notification`).*

### Terminal 6: API Gateway
```bash
cd api-gateway
mvn spring-boot:run
```
*(Routes incoming requests from `http://localhost:8080/api/v1/...` to the appropriate service).*

---

## 6. Step 4: Run the Next.js Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Pre-Seeded Accounts for Testing

Once the `identity-service` has started, the database is pre-seeded with the following ready-to-use accounts:

| Portal | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@swiftdrop.lk` | `Admin@123` | `ADMIN`, `HEAD_OFFICE_ADMIN` |
| **Branch Dispatcher** | `dispatcher.colombo@swiftdrop.lk` | `Dispatcher@123` | `DISPATCHER` |
| **Courier Fleet** | `courier1@swiftdrop.lk` | `Courier@123` | `COURIER` |
| **Merchant Portal** | `merchant@swiftdrop.lk` | `Merchant@123` | `MERCHANT` |
| **Customer Portal** | `customer@swiftdrop.lk` | `Customer@123` | `CUSTOMER` |

---

## 8. Verifying Service Health

You can check service status through the API Gateway:

- **Identity Service**: [http://localhost:8080/services/identity/health](http://localhost:8080/services/identity/health)
- **Organization Service**: [http://localhost:8080/services/organization/health](http://localhost:8080/services/organization/health)
- **Order Service**: [http://localhost:8080/services/order/health](http://localhost:8080/services/order/health)
- **Dispatch Service**: [http://localhost:8080/services/dispatch/health](http://localhost:8080/services/dispatch/health)
- **Notification Service**: [http://localhost:8080/services/notification/health](http://localhost:8080/services/notification/health)
- **Full Platform Health Matrix**: Navigate to `/health` on the frontend ([http://localhost:3000/health](http://localhost:3000/health)).

---

## 9. Management Dashboards

### pgAdmin 4
- **URL**: [http://localhost:5050](http://localhost:5050)
- **Email**: `admin@swiftdrop.lk`
- **Password**: `admin`
- Enter `postgrespassword` when connecting to the `SwiftDrop Local PostgreSQL` server.

### RabbitMQ Management Console
- **URL**: [http://localhost:15672](http://localhost:15672)
- **Username**: `swiftdrop`
- **Password**: `password123`
- Inspect message queues (`order.created`, `dispatch.events`, `notification.queue`, etc.) and broker exchanges.

---

## 10. Teardown & Reset Commands

### Stop Infrastructure (Keep Data)
```bash
docker compose -f local-dev/docker-compose.yml down
```

### Complete Reset (Wipe All DBs and Start Fresh)
```bash
docker compose -f local-dev/docker-compose.yml down -v
docker compose -f local-dev/docker-compose.yml up -d
```

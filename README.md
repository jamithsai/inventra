# INVENTRA MULTI-TENANT INVENTORY PLATFORM

[![ASP.NET Core 8](https://img.shields.io/badge/ASP.NET%20Core-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![JWT Bearer Authentication](https://img.shields.io/badge/Authentication-JWT%20Bearer%20%2B%20PBKDF2-000000?logo=jsonwebtokens)](https://jwt.io/)
[![EF Core Query Filters](https://img.shields.io/badge/EF%20Core-Global%20Query%20Filters-68217A)](https://learn.microsoft.com/en-us/ef/core/)
[![React 19](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-61DAFB?logo=react)](https://react.dev/)
[![AWS S3 Partitioned](https://img.shields.io/badge/Storage-AWS%20S3%20Tenant%20Isolated-FF9900?logo=amazons3)](https://aws.amazon.com/s3/)
[![Security Verified](https://img.shields.io/badge/Security-Zero--Trust%20Tenant%20Resolution-10B981)](#security-guarantees)

---

## 📌 Executive Summary

**Inventra Multi-Tenant Inventory Platform** is a production-grade enterprise SaaS architecture designed to host multiple independent organizations (*Acme Retail*, *Nova Electronics*, *Zenith Supplies*) on a shared infrastructure while enforcing **hardware-grade mathematical isolation** of data and file storage across all application layers.

### Core Tenet
> **"Never trust client claims alone."**
> Authentication is strictly enforced via **cryptographic JWT Bearer tokens** with PBKDF2 password hashing. A request header such as `X-Tenant-ID` only states *requested workspace context*. Multi-tenant authorization is validated server-side by checking the authenticated user's `TenantMemberships` against the database before initializing scoped dependency injection (`ITenantContext`) and **EF Core Global Query Filters** that automatically inject tenant boundary predicates into every database query.

---

## 🏗 Multi-Tenant Architecture & Defense-in-Depth

```mermaid
flowchart TD
    subgraph Client ["Frontend Layer (React + Vite)"]
        Login["Enterprise Login Page (PBKDF2 + JWT Auth)"]
        UI["Enterprise SaaS Dashboard"]
        Selector["Authorized Workspace Selector"]
        Profile["User Profile & Session Sign Out"]
        Login -->|Authenticates| UI
        UI --> Selector
        UI --> Profile
    end

    subgraph API_Gate ["ASP.NET Core Web API Gateway"]
        Req["Incoming HTTP Request"]
        JwtAuth["JWT Bearer Authentication Handler"]
        Middleware["TenantResolutionMiddleware (Zero Trust)"]
        AuthCheck["Cryptographic User Membership Validation"]
        Context["ITenantContext (Scoped DI)"]

        Selector -->|Bearer Token + X-Tenant-ID| Req
        Req --> JwtAuth
        JwtAuth --> Middleware
        Middleware --> AuthCheck
        AuthCheck -->|Authorized| Context
        AuthCheck -->|Unauthorized Spoofing| Err403["403 Forbidden / Access Denied"]
    end

    subgraph Core_Services ["Service & Data Access Layer"]
        Services["IInventoryService / Controllers"]
        EF["Entity Framework Core (AppDbContext)"]
        Filter["Global Query Filter: e.TenantId == CurrentTenantId"]
        DB[(SQLite / PostgreSQL / SQL Server)]

        Context --> Services
        Services --> EF
        EF --> Filter
        Filter --> DB
    end

    subgraph Storage_Layer ["S3 File Storage Layer"]
        StorageService["IFileStorageService (S3FileStorageService)"]
        S3["AWS S3 Bucket: /tenants/{tenantId}/products/..."]

        Context --> StorageService
        StorageService --> S3
    end
```

---

## 🛡 Demonstrable Isolation Across 6 Layers

| Layer | Implementation Mechanism | Security Guarantee |
| :--- | :--- | :--- |
| **1. Authentication Layer** | JWT Bearer Tokens + PBKDF2-SHA256 Password Hashing | Authenticated user identity derived exclusively from signed cryptographic JWT tokens. |
| **2. Middleware Layer** | `TenantResolutionMiddleware` | Intercepts `X-Tenant-ID` and cross-validates against database `TenantMemberships`. Rejects unauthorized spoofing with `403 Forbidden`. |
| **3. Scoped Context** | `ITenantContext` / `TenantContext` | Thread-safe per-request DI container lifetime holding verified `CurrentTenantId` and `CurrentUserId`. |
| **4. EF Core Data Access** | `.HasQueryFilter(e => e.TenantId == _tenantContext.CurrentTenantId)` | Automatically appends `WHERE TenantId = @currentTenant` to all `SELECT`, `UPDATE`, `DELETE` queries. |
| **5. Database Storage** | `ITenantEntity` & Composite Unique Indexes `(TenantId, SKU)` | Hard multitenant relational schemas preventing cross-tenant collisions. |
| **6. File Storage (AWS S3)** | `IFileStorageService` + `tenants/{tenantId}/products/{fileName}` | S3 key paths derived strictly from server tenant context. No client-supplied path traversal possible. Cascade cleanup on product delete. |

---

## 👥 Demo Accounts & Workspaces

The platform seeds 3 distinct organizations and 4 enterprise accounts (Default demo password for all accounts: `Inventra@2026!`):

| Account Name | Work Email | Platform Role | Authorized Workspaces | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Admin User** | `admin@platform.io` | `ADMIN` | Acme Retail, Nova Electronics | Multi-Tenant Platform Owner with multi-workspace access. |
| **Nova Electronics Manager** | `manager@nova-electronics.io` | `MANAGER` | Nova Electronics | Operations Lead with single-workspace scope. |
| **Zenith Supplies Specialist** | `specialist@zenith-supplies.io` | `MANAGER` | Zenith Supplies | Inventory Specialist with single-workspace scope. |
| **Acme Compliance Auditor** | `auditor@acme-retail.com` | `VIEWER` | Acme Retail | Read-only compliance auditor for Acme Retail. |

> [!NOTE]
> All passwords are cryptographically hashed using **PBKDF2-SHA256 with 100,000 iterations and 128-bit salt**. The Login page provides a quick-select helper that autofills only the email address for convenient demonstration while requiring real password verification.

---

## 🚀 Quick Start Guide

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/)
- [Node.js v18+ & npm](https://nodejs.org/)

### 1. Run the Backend API
```powershell
cd backend/MultiTenantInventory.Api
dotnet run
```
* API Server will start at: `http://localhost:5000`
* Interactive Swagger API Docs with Bearer JWT Support: `http://localhost:5000/swagger`

### 2. Run the Frontend Dashboard
```powershell
cd frontend
npm install
npm run dev
```
* Open in browser: `http://localhost:5173`

---

## 🧪 Running Automated Security Verification Tests

Execute the comprehensive xUnit test suite (20 automated integration tests covering authentication, tenant isolation, S3 key isolation, and cascade cleanup):

```powershell
dotnet test backend/MultiTenantInventory.Tests/MultiTenantInventory.Tests.csproj
```

---

## 🎯 Step-by-Step Demonstration Flow

1. **Step 1 - Enterprise Sign In:** On `http://localhost:5173`, select the **Admin User** persona (or enter `admin@platform.io` / `Inventra@2026!`) and click **Sign In**.
2. **Step 2 - Filtered Workspace Dropdown:** In the top-right navbar, observe the Workspace dropdown contains **only** `Acme Retail` and `Nova Electronics` (the accounts Admin User is authorized to access).
3. **Step 3 - Switch Workspaces:** Switch to **Nova Electronics**. Notice the catalog dynamically refreshes with microcontrollers and IoT boards.
4. **Step 4 - Live Security Attack Bench:** Navigate to **"Isolation Bench"** in the sidebar and click **"Run All 5 Test Scenarios"**.
5. **Step 5 - Verify 100% Defense Passes:**
   - *Cross-Tenant IDOR:* Blocked by EF Core Query Filters (`404 Not Found`).
   - *Unauthorized Header Spoofing:* Blocked by `TenantResolutionMiddleware` (`403 Forbidden`).
   - *Cross-Tenant Mutation:* Blocked by `TenantGuard` (`404 Not Found`).
   - *Cross-Tenant Deletion:* Blocked by Query Filters (`404 Not Found`).
   - *S3 Path Traversal:* Blocked by S3 Key Derivation (`404 Not Found`).
6. **Step 6 - User Profile & Sign Out:** Click the user avatar in the navbar to inspect assigned roles and click **Sign Out** to test session revocation.

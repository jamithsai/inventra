# INVENTRA — Project Architecture & Persistent Rules

## 1. Product Identity & Purpose

- **Product Name:** `INVENTRA`
- **Product Classification:** Secure Multi-Tenant Enterprise SaaS Inventory & Supply Chain Platform
- **Core Mission:** Provide multi-tenant enterprise inventory management hosting multiple independent customer organizations (e.g., *Acme Retail*, *Nova Electronics*, *Zenith Supplies*, *Orbit Healthcare*, and dynamically provisioned tenants) on shared infrastructure while enforcing **hardware-grade mathematical isolation** across data, storage, compute, and analytics layers.
- **Branding Rule:** Always use the official product name **INVENTRA**. Never revert to legacy or generic names.

---

## 2. Non-Negotiable Prime Directive

> **NO CROSS-TENANT DATA ACCESS UNDER ANY CIRCUMSTANCE.**
> 
> Tenant isolation supersedes developer convenience, UI simplicity, demo shortcuts, or performance micro-optimizations. If any proposed feature or refactor creates even a theoretical risk of cross-tenant data bleed, it MUST be redesigned immediately.

---

## 3. Defense-in-Depth Architecture & Request Pipeline

Every incoming request must traverse an unbroken 6-layer server-side authorization and isolation chain:

```
Authenticated User (Cryptographic JWT Token + PBKDF2)
        ↓
Requested Workspace Context (X-Tenant-ID Header)
        ↓
TenantResolutionMiddleware (Server-Side Membership & Status Verification)
        ↓
ITenantContext (Scoped Per-Request Dependency Injection Lifetime)
        ↓
Tenant-Scoped Domain Services (IInventoryService, IAnalyticsService, ITenantProvisioningService)
        ↓
EF Core Global Query Filters (HasQueryFilter(e => e.TenantId == _tenantContext.CurrentTenantId))
        ↓
Tenant-Isolated Relational Database Access (SQLite / PostgreSQL / SQL Server)
```

### File & Blob Storage Isolation Chain

```
Authenticated + Authorized Tenant Session
        ↓
ITenantContext (Server-Derived CurrentTenantId)
        ↓
Tenant-Aware Storage Service (S3FileStorageService / IFileStorageService)
        ↓
AWS S3 Bucket Partition: s3://{bucket}/tenants/{tenantId}/products/{fileName}
```

---

## 4. Multi-Tenant Security & Isolation Invariants

### A. Authentication & User Identity
1. **Server-Validated Identity:** User identity is derived exclusively from cryptographically signed HMAC-SHA256 JWT Bearer tokens containing claims (`ClaimTypes.NameIdentifier`, `ClaimTypes.Email`, `ClaimTypes.Role`).
2. **Zero Client Trust:** Never trust client-provided `UserId`, `TenantId`, `Role`, or authorization flags in HTTP request bodies or query strings.
3. **Password Security:** Passwords must be hashed using PBKDF2 with HMAC-SHA256, a secure salt, and $\ge 100,000$ iterations. Plaintext passwords or raw token secrets must NEVER be persisted, returned in API payloads, or logged.

### B. Tenant Context & Zero-Trust Resolution
1. **`X-Tenant-ID` is a Selector, NOT Authorization:** The `X-Tenant-ID` header merely specifies the *requested workspace context*. The `TenantResolutionMiddleware` must query the database to verify that the authenticated user possesses an active `TenantMembership` for that specific tenant.
2. **Rejection Rules:**
   - Missing `X-Tenant-ID` header on tenant-scoped endpoints $\rightarrow$ `400 Bad Request`.
   - User lacks membership in requested tenant $\rightarrow$ `403 Forbidden`.
   - Requested tenant is `SUSPENDED` $\rightarrow$ `403 Forbidden (TenantSuspended)`.
   - Tenant does not exist $\rightarrow$ `404 Not Found` or `403 Forbidden`.
3. **Scoped Context Lifetime:** `ITenantContext` (`TenantContext`) is registered as a scoped service in ASP.NET Core DI, bound strictly to the lifetime of the single HTTP request. Global mutable static tenant state is strictly prohibited.

### C. Database Isolation & Query Filtering
1. **EF Core Global Query Filters:** All tenant-owned entities implementing `ITenantEntity` (`InventoryItem`, `InventoryTransaction`, `TenantFile`, `AuditLog`) MUST have global query filters configured in `AppDbContext`:
   ```csharp
   modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantContext.CurrentTenantId);
   ```
2. **Server-Side Enforcement:** Global query filters automatically append `WHERE TenantId = @currentTenantId` to all generated SQL queries (`SELECT`, `UPDATE`, `DELETE`), preventing accidental omission of tenant predicates.
3. **Write & Mutation Protection:** On `POST`, `PUT`, or `DELETE`, entity `TenantId` is assigned automatically from `ITenantContext.CurrentTenantId`. Client-supplied tenant IDs in request bodies must be ignored or validated against the active context. Cross-tenant modification or deletion must be mathematically impossible.
4. **Relational Integrity:** Multi-tenant entities use composite unique indexes (e.g., `(TenantId, SKU)`) allowing different organizations to use identical SKUs independently without collisions.

### D. Insecure Direct Object Reference (IDOR) Defense
- Querying a record by ID (e.g., `GET /api/inventory/{id}`) belonging to Tenant B while authenticated as Tenant A MUST return `404 Not Found` (due to the query filter) or `403 Forbidden`. It must NEVER return foreign tenant data.

### E. File & S3 Storage Isolation
1. **Server-Constructed Object Keys:** S3 storage keys must always be constructed server-side using the format `tenants/{_tenantContext.CurrentTenantId}/products/{guid}_{sanitizedFileName}`.
2. **Path Traversal Protection:** Client-supplied filenames must be sanitized and stripped of directory traversal sequences (`../`, `..\`, `/`, `\`).
3. **Cascade File Cleanup:** Deleting a product entity must automatically delete all associated physical/S3 files linked to that entity.
4. **Credential Isolation:** AWS access keys and S3 bucket secrets must remain strictly server-side and never exposed to the frontend or public APIs.

---

## 5. Platform Administration & Tenant Provisioning

### A. Role Segregation
- **Platform Administrator (`ADMIN`):** Global operator role. Authorized to access `/api/platform/tenants`, provision new tenant organizations, toggle tenant status (`ACTIVE`/`SUSPENDED`), and inspect platform-wide memberships.
- **Tenant Administrator / Manager (`MANAGER`):** Scoped strictly to their authorized tenant workspace(s). Manages inventory, files, transactions, and audit records within their tenant. Cannot access platform administration APIs.
- **Tenant Viewer (`VIEWER`):** Read-only inventory access within their authorized tenant workspace.

### B. Atomic Tenant Provisioning
1. **ACID Transactional Consistency:** The onboarding process (`TenantProvisioningService.ProvisionTenantAsync`) executes within an atomic database transaction:
   - Create `Tenant` record with unique normalized slug.
   - Create initial `User` account (`Role = "MANAGER"`).
   - Create `TenantMembership` (`Role = "OWNER"`).
   - Generate cryptographically secure `TenantInvitation` with SHA-256 token hash.
   - Write structured `AuditLog` entry.
   - Commit transaction. If any step fails, roll back completely.
2. **Cryptographic One-Time Invitations:**
   - Raw invitation token is generated with a 256-bit cryptographically secure random generator and returned once in the provisioning response.
   - Only the SHA-256 hash is persisted in `TenantInvitation.TokenHash`.
   - Token activation at `/invite/{token}` enforces strong password requirements, marks invitation `ACCEPTED`, and activates the user account.

---

## 6. Real-Time Analytics & Financial Invariants

1. **Server-Side Aggregation:** All dashboard analytics (`/api/analytics/dashboard?timeRangeDays=30`) MUST be aggregated in the database through `IAnalyticsService` with `ITenantContext` query filters applied. Never download all tenants' records to the browser for client-side filtering.
2. **Mathematical Accuracy:**
   - Total Valuation: $\sum (\text{Quantity} \times \text{Price})$ over active tenant items.
   - Stock Health Distribution: Real-time classification based on tenant stock vs. reorder thresholds.
   - Stock Movement Trends: Continuous daily time-series tracking inbound stock additions vs. outbound reductions.
3. **Zero Fabricated Data:** Every KPI, chart series, and insight card must reflect real, verifiable database records.

---

## 7. Frontend Engineering Conventions

- **Technology Stack:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts.
- **Tenant Context in Client:** Active workspace stored in memory/session; Axios interceptors automatically attach `Authorization: Bearer <token>` and `X-Tenant-ID: <currentTenantId>` to all API requests.
- **Workspace Switching:** Switching workspaces is NOT identity switching. Changing the active workspace must trigger a fresh server-authorized data fetch. Unauthorized workspaces must never be rendered or accessible.
- **Error & Status Feedback:** Render clear, accessible UI states for loading, empty datasets, validation errors, and permission denials (such as `403 Forbidden` or `Tenant Suspended` banners).

---

## 8. Audit Logging & Security Observability

- **Audited Events:** Authentication events (login, logout, failed attempts), workspace switches, tenant creation/suspension, inventory CRUD, stock adjustments, file uploads/deletions, and security authorization rejections.
- **Data Scrubbing:** Audit log metadata must NEVER contain passwords, password hashes, JWT tokens, AWS credentials, or raw invitation secrets.

---

## 9. Testing & Quality Standards

- **Continuous Verification:** Any changes touching authentication, authorization, tenant isolation, or data access must be verified with the automated xUnit test suite (`MultiTenantInventory.Tests`) and end-to-end browser tests.
- **Required Test Coverage Areas:**
  - Authorized tenant access vs. unauthorized cross-tenant rejection (`403 Forbidden`).
  - Cross-tenant IDOR read, update, and delete blocking.
  - S3 key prefix isolation and path traversal defense.
  - Platform Admin vs. Tenant Admin role enforcement.
  - Atomic tenant provisioning and cryptographic invitation lifecycle.
  - Executive analytics aggregation isolation.

---

## 10. Deployment & Secrets Management

- **Docker & Cloud Hosting:** Containerized multi-stage ASP.NET Core build (`Dockerfile`) and static frontend deployment configured in `render.yaml`.
- **Environment Isolation:** Database connection strings, JWT signing keys, AWS S3 credentials, and environment modes (`Production` vs `Development`) must be supplied via environment variables, never hardcoded in source files.

---

## 11. Relationship with Global Autonomous Workflow

- **Role of Project Rules (This File):** Defines **WHAT** architectural invariants, security boundaries, and domain rules must remain permanently true for INVENTRA.
- **Role of Global Rules:** Governs **HOW** the AI pair programmer operates autonomously (dynamic tool selection, risk calibration, tier-based verification, and efficient engineering execution without rigid pipelines).

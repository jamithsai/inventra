# ARCHITECTURE & SECURITY SPECIFICATION

## Multi-Tenant Inventory Management Platform

This document details the architectural blueprint, isolation layers, data models, and request pipelines of the Nexus Multi-Tenant Inventory Platform.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    Client["React 19 Frontend<br/>(Vite + Tailwind SaaS UI)"]
    
    subgraph "ASP.NET Core Web API 8.0"
        Gateway["HTTP Request<br/>X-Tenant-ID: {tenantId}<br/>X-User-ID: {userId}"]
        Middleware["TenantResolutionMiddleware<br/>(Zero-Trust Membership Validator)"]
        Context["ITenantContext<br/>(Scoped Per-Request Container)"]
        
        Controllers["Controllers<br/>• InventoryController<br/>• FilesController<br/>• AuditLogsController"]
        Services["Services<br/>• InventoryService<br/>• S3FileStorageService"]
        
        EFCore["Entity Framework Core 8<br/>• HasQueryFilter(e => e.TenantId == CurrentTenantId)<br/>• EnforceTenantIsolationOnSave()"]
    end
    
    subgraph "Persistent Storage"
        DB[("Relational Database<br/>(SQLite / SQL Server / Postgres)")]
        S3["AWS S3 Storage<br/>s3://bucket/tenants/{tenantId}/products/..."]
    end

    Client -->|HTTP Headers| Gateway
    Gateway --> Middleware
    Middleware -->|Sets TenantId| Context
    Context --> Services
    Controllers --> Services
    Services --> EFCore
    Services --> S3
    EFCore --> DB
```

---

## 2. Request Lifecycle & Tenant Resolution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Browser
    participant Middleware as TenantResolutionMiddleware
    participant Resolver as ITenantResolver
    participant Context as ITenantContext
    participant Controller as InventoryController
    participant Service as InventoryService
    participant EF as EF Core (AppDbContext)
    participant DB as SQL Database

    User->>Middleware: GET /api/inventory (Header: X-Tenant-ID: acme-retail, User: usr_admin_1)
    
    rect rgb(30, 41, 59)
        note over Middleware, Resolver: Zero-Trust Tenant Resolution
        Middleware->>Resolver: GetTenantByIdAsync("acme-retail")
        Resolver-->>Middleware: Tenant Exists (Acme Retail)
        
        Middleware->>Resolver: IsUserAuthorizedForTenantAsync("usr_admin_1", "acme-retail")
        Resolver-->>Middleware: Authorized = TRUE
        
        Middleware->>Context: SetTenant("acme-retail", "usr_admin_1")
    end
    
    Middleware->>Controller: Invoke Action
    Controller->>Service: GetItemsAsync()
    Service->>EF: _dbContext.InventoryItems.ToListAsync()
    
    rect rgb(15, 23, 42)
        note over EF, DB: Global Query Filter Applied Automatically
        EF->>DB: SELECT * FROM InventoryItems WHERE TenantId = 'acme-retail'
        DB-->>EF: [iPhone 15, Dell XPS 15, Samsung G9]
    end
    
    EF-->>Service: Tenant Items
    Service-->>Controller: DTOs
    Controller-->>User: 200 OK (Isolated Tenant Data)
```

---

## 3. S3 File Storage Partitioning

```mermaid
flowchart LR
    subgraph StorageRoot ["Amazon S3 Bucket: multi-tenant-inventory-storage-prod"]
        subgraph TenantAcme ["/tenants/acme-retail/"]
            P1["products/iphone15_spec.pdf"]
            P2["products/dell_xps_warranty.pdf"]
        end
        subgraph TenantNova ["/tenants/nova-electronics/"]
            P3["products/esp32_datasheet.pdf"]
            P4["products/raspberry_pi5.png"]
        end
        subgraph TenantZenith ["/tenants/zenith-supplies/"]
            P5["products/aeron_manual.pdf"]
            P6["products/standing_desk.jpg"]
        end
    end
```

### Key Security Invariants:
1. S3 Key Path Derivation: Keys are generated exclusively server-side using `$"tenants/{_tenantContext.CurrentTenantId}/products/{guid}_{sanitizedFilename}"`.
2. Path Traversal Defense: Client-supplied directory paths are ignored and sanitized.
3. Access Authorization: Pre-signed download URLs and streaming endpoints check `TenantFile.TenantId == CurrentTenantId` before retrieval.

---

## 4. Entity-Relationship Data Model

```mermaid
erDiagram
    Tenant ||--o{ TenantMembership : has
    User ||--o{ TenantMembership : belongs_to
    Tenant ||--o{ InventoryItem : owns
    Tenant ||--o{ InventoryTransaction : logs
    Tenant ||--o{ TenantFile : stores
    Tenant ||--o{ AuditLog : records
    InventoryItem ||--o{ InventoryTransaction : tracks

    Tenant {
        string Id PK
        string Name
        string Code UK
        string Description
        string Status
        datetime CreatedAt
    }

    User {
        string Id PK
        string Name
        string Email UK
        string Role
        datetime CreatedAt
    }

    TenantMembership {
        string Id PK
        string UserId FK
        string TenantId FK
        string Role
        datetime CreatedAt
    }

    InventoryItem {
        string Id PK
        string TenantId FK
        string Name
        string SKU
        string Category
        int Quantity
        decimal Price
        int LowStockThreshold
        string ImageUrl
        datetime CreatedAt
        datetime UpdatedAt
    }

    InventoryTransaction {
        string Id PK
        string TenantId FK
        string InventoryItemId FK
        string Type
        int Quantity
        string Note
        datetime CreatedAt
    }

    TenantFile {
        string Id PK
        string TenantId FK
        string FileName
        string S3Key
        long FileSizeBytes
        string ContentType
        datetime UploadedAt
        string AssociatedItemId
    }

    AuditLog {
        string Id PK
        string TenantId FK
        string UserId
        string UserName
        string Action
        string EntityType
        string EntityId
        string Details
        datetime CreatedAt
    }
```

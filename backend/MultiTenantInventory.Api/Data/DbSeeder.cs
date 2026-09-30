using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Services;

namespace MultiTenantInventory.Api.Data;

public static class DbSeeder
{
    public const string DefaultDemoPassword = "Inventra@2026!";

    public static async Task SeedAsync(AppDbContext context)
    {
        // Ensure Database Created
        await context.Database.EnsureCreatedAsync();

        if (await context.Tenants.AnyAsync())
        {
            // Update password hashes if they are empty for seeded users
            var existingUsers = await context.Users.ToListAsync();
            var updated = false;
            foreach (var u in existingUsers)
            {
                if (string.IsNullOrEmpty(u.PasswordHash))
                {
                    u.PasswordHash = PasswordHasher.Hash(DefaultDemoPassword);
                    updated = true;
                }
            }
            if (updated)
            {
                await context.SaveChangesAsync();
            }
            return; // Already seeded
        }

        var defaultPasswordHash = PasswordHasher.Hash(DefaultDemoPassword);

        // 1. Seed Tenants
        var tenants = new List<Models.Tenant>
        {
            new()
            {
                Id = "acme-retail",
                Name = "Acme Retail",
                Code = "ACME",
                Description = "High-volume consumer electronics, laptops, flagship mobile devices and personal computing gear.",
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new()
            {
                Id = "nova-electronics",
                Name = "Nova Electronics",
                Code = "NOVA",
                Description = "Embedded systems distributor, IoT microcontrollers, single-board computers and sensors.",
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new()
            {
                Id = "zenith-supplies",
                Name = "Zenith Supplies",
                Code = "ZENITH",
                Description = "Premium enterprise office furnishings, laser printers, ergonomic workstations and infrastructure.",
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            }
        };
        context.Tenants.AddRange(tenants);

        // 2. Seed Users
        var users = new List<User>
        {
            new()
            {
                Id = "usr_admin_1",
                Name = "Admin User",
                Email = "admin@platform.io",
                Role = "ADMIN",
                PasswordHash = defaultPasswordHash,
                CreatedAt = DateTime.UtcNow.AddMonths(-3)
            },
            new()
            {
                Id = "usr_manager_nova",
                Name = "Nova Electronics Manager",
                Email = "manager@nova-electronics.io",
                Role = "MANAGER",
                PasswordHash = defaultPasswordHash,
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            },
            new()
            {
                Id = "usr_zenith_user",
                Name = "Zenith Supplies Specialist",
                Email = "specialist@zenith-supplies.io",
                Role = "MANAGER",
                PasswordHash = defaultPasswordHash,
                CreatedAt = DateTime.UtcNow.AddMonths(-1)
            },
            new()
            {
                Id = "usr_auditor_acme",
                Name = "Acme Compliance Auditor",
                Email = "auditor@acme-retail.com",
                Role = "VIEWER",
                PasswordHash = defaultPasswordHash,
                CreatedAt = DateTime.UtcNow.AddMonths(-2)
            }
        };
        context.Users.AddRange(users);

        // 3. Seed Tenant Memberships
        var memberships = new List<TenantMembership>
        {
            // Admin User is authorized for ACME and NOVA, but NOT ZENITH
            new() { Id = "mem_1", UserId = "usr_admin_1", TenantId = "acme-retail", Role = "OWNER" },
            new() { Id = "mem_2", UserId = "usr_admin_1", TenantId = "nova-electronics", Role = "ADMIN" },

            // Nova Manager is authorized ONLY for NOVA
            new() { Id = "mem_3", UserId = "usr_manager_nova", TenantId = "nova-electronics", Role = "MANAGER" },

            // Zenith User is authorized ONLY for ZENITH
            new() { Id = "mem_4", UserId = "usr_zenith_user", TenantId = "zenith-supplies", Role = "OWNER" },

            // Auditor is authorized ONLY for ACME
            new() { Id = "mem_5", UserId = "usr_auditor_acme", TenantId = "acme-retail", Role = "AUDITOR" }
        };
        context.TenantMemberships.AddRange(memberships);

        // 4. Seed Inventory Items for Acme Retail
        var acmeItems = new List<InventoryItem>
        {
            new()
            {
                Id = "item_acme_1",
                TenantId = "acme-retail",
                Name = "iPhone 15 Pro Max 256GB Titanium",
                SKU = "ACM-IPH-15P",
                Category = "Smartphones",
                Quantity = 42,
                Price = 1199.00m,
                LowStockThreshold = 10,
                ImageUrl = "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = "item_acme_2",
                TenantId = "acme-retail",
                Name = "Dell XPS 15 OLED Laptop i9 32GB",
                SKU = "ACM-XPS-15",
                Category = "Laptops",
                Quantity = 15,
                Price = 1899.00m,
                LowStockThreshold = 5,
                ImageUrl = "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-18),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = "item_acme_3",
                TenantId = "acme-retail",
                Name = "Samsung Odyssey Neo G9 49\" Curved Monitor",
                SKU = "ACM-SAM-G9",
                Category = "Displays",
                Quantity = 8,
                Price = 1499.00m,
                LowStockThreshold = 3,
                ImageUrl = "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new()
            {
                Id = "item_acme_4",
                TenantId = "acme-retail",
                Name = "Sony WH-1000XM5 Wireless ANC Headphones",
                SKU = "ACM-SNY-XM5",
                Category = "Audio",
                Quantity = 34,
                Price = 399.00m,
                LowStockThreshold = 8,
                ImageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-12),
                UpdatedAt = DateTime.UtcNow.AddHours(-10)
            },
            new()
            {
                Id = "item_acme_5",
                TenantId = "acme-retail",
                Name = "Apple Watch Ultra 2 GPS+Cellular",
                SKU = "ACM-AW-ULT2",
                Category = "Wearables",
                Quantity = 4,
                Price = 799.00m,
                LowStockThreshold = 5,
                ImageUrl = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new()
            {
                Id = "item_acme_6",
                TenantId = "acme-retail",
                Name = "Logitech MX Master 3S Wireless Mouse",
                SKU = "ACM-LOG-MX3",
                Category = "Accessories",
                Quantity = 0,
                Price = 99.00m,
                LowStockThreshold = 10,
                ImageUrl = "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-8),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        context.InventoryItems.AddRange(acmeItems);

        // 5. Seed Inventory Items for Nova Electronics
        var novaItems = new List<InventoryItem>
        {
            new()
            {
                Id = "item_nova_1",
                TenantId = "nova-electronics",
                Name = "ESP32-WROOM-32D Dual-Core MCU Dev Board",
                SKU = "NOV-ESP-32D",
                Category = "Microcontrollers",
                Quantity = 450,
                Price = 6.50m,
                LowStockThreshold = 50,
                ImageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = "item_nova_2",
                TenantId = "nova-electronics",
                Name = "Arduino Uno R4 WiFi Microcontroller",
                SKU = "NOV-ARD-R4W",
                Category = "Microcontrollers",
                Quantity = 120,
                Price = 27.50m,
                LowStockThreshold = 20,
                ImageUrl = "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-22),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = "item_nova_3",
                TenantId = "nova-electronics",
                Name = "Raspberry Pi 5 8GB ARM SBC",
                SKU = "NOV-RPI-58G",
                Category = "Single-Board Computers",
                Quantity = 65,
                Price = 80.00m,
                LowStockThreshold = 15,
                ImageUrl = "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddHours(-12)
            },
            new()
            {
                Id = "item_nova_4",
                TenantId = "nova-electronics",
                Name = "STM32 Nucleo-64 Cortex-M4 Board",
                SKU = "NOV-STM-NUC",
                Category = "ARM Boards",
                Quantity = 85,
                Price = 14.00m,
                LowStockThreshold = 20,
                ImageUrl = "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-4)
            },
            new()
            {
                Id = "item_nova_5",
                TenantId = "nova-electronics",
                Name = "Raspberry Pi Pico W with Headers",
                SKU = "NOV-RPI-PICW",
                Category = "Microcontrollers",
                Quantity = 12,
                Price = 7.00m,
                LowStockThreshold = 25,
                ImageUrl = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddHours(-4)
            },
            new()
            {
                Id = "item_nova_6",
                TenantId = "nova-electronics",
                Name = "LoRa SX1276 915MHz Wireless Module",
                SKU = "NOV-LRA-1276",
                Category = "Wireless & IoT",
                Quantity = 0,
                Price = 12.00m,
                LowStockThreshold = 15,
                ImageUrl = "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        context.InventoryItems.AddRange(novaItems);

        // 6. Seed Inventory Items for Zenith Supplies
        var zenithItems = new List<InventoryItem>
        {
            new()
            {
                Id = "item_zenith_1",
                TenantId = "zenith-supplies",
                Name = "Herman Miller Aeron Ergonomic Chair Size B",
                SKU = "ZEN-HMA-CHR",
                Category = "Ergonomic Furniture",
                Quantity = 18,
                Price = 1495.00m,
                LowStockThreshold = 5,
                ImageUrl = "https://images.unsplash.com/photo-1580481077197-28d11c759f2c?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = "item_zenith_2",
                TenantId = "zenith-supplies",
                Name = "HP LaserJet Enterprise M507dn Printer",
                SKU = "ZEN-HP-LJ507",
                Category = "Printers & Imaging",
                Quantity = 6,
                Price = 699.00m,
                LowStockThreshold = 2,
                ImageUrl = "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new()
            {
                Id = "item_zenith_3",
                TenantId = "zenith-supplies",
                Name = "Keychron Q1 Pro Wireless Mechanical Keyboard",
                SKU = "ZEN-KEY-Q1P",
                Category = "Peripherals",
                Quantity = 28,
                Price = 199.00m,
                LowStockThreshold = 8,
                ImageUrl = "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddHours(-18)
            },
            new()
            {
                Id = "item_zenith_4",
                TenantId = "zenith-supplies",
                Name = "Electric Dual-Motor Standing Desk 60x30",
                SKU = "ZEN-DSK-MOT60",
                Category = "Ergonomic Furniture",
                Quantity = 14,
                Price = 580.00m,
                LowStockThreshold = 4,
                ImageUrl = "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = "item_zenith_5",
                TenantId = "zenith-supplies",
                Name = "Fellowes Powershred 24-Sheet Cross-Cut Shredder",
                SKU = "ZEN-FEL-SHR24",
                Category = "Office Equipment",
                Quantity = 2,
                Price = 320.00m,
                LowStockThreshold = 3,
                ImageUrl = "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddHours(-8)
            },
            new()
            {
                Id = "item_zenith_6",
                TenantId = "zenith-supplies",
                Name = "Logitech Rally 4K Ultra-HD Conference Cam",
                SKU = "ZEN-LOG-RAL4K",
                Category = "Conference Tech",
                Quantity = 0,
                Price = 1299.00m,
                LowStockThreshold = 2,
                ImageUrl = "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300",
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        context.InventoryItems.AddRange(zenithItems);

        // 7. Seed S3 Tenant Files
        var files = new List<TenantFile>
        {
            new()
            {
                Id = "file_acme_1",
                TenantId = "acme-retail",
                FileName = "iphone15_pro_datasheet.pdf",
                S3Key = "tenants/acme-retail/products/spec_iphone15.pdf",
                FileSizeBytes = 245000,
                ContentType = "application/pdf",
                UploadedAt = DateTime.UtcNow.AddDays(-10),
                AssociatedItemId = "item_acme_1",
                AssociatedItemName = "iPhone 15 Pro Max 256GB Titanium",
                DownloadUrl = "/api/files/stream/tenants/acme-retail/products/spec_iphone15.pdf"
            },
            new()
            {
                Id = "file_acme_2",
                TenantId = "acme-retail",
                FileName = "dell_xps_warranty_doc.pdf",
                S3Key = "tenants/acme-retail/products/warranty_dellxps.pdf",
                FileSizeBytes = 189000,
                ContentType = "application/pdf",
                UploadedAt = DateTime.UtcNow.AddDays(-8),
                AssociatedItemId = "item_acme_2",
                AssociatedItemName = "Dell XPS 15 OLED Laptop i9 32GB",
                DownloadUrl = "/api/files/stream/tenants/acme-retail/products/warranty_dellxps.pdf"
            },
            new()
            {
                Id = "file_nova_1",
                TenantId = "nova-electronics",
                FileName = "esp32_wroom_datasheet_v3.pdf",
                S3Key = "tenants/nova-electronics/products/esp32_datasheet.pdf",
                FileSizeBytes = 1240000,
                ContentType = "application/pdf",
                UploadedAt = DateTime.UtcNow.AddDays(-12),
                AssociatedItemId = "item_nova_1",
                AssociatedItemName = "ESP32-WROOM-32D Dual-Core MCU Dev Board",
                DownloadUrl = "/api/files/stream/tenants/nova-electronics/products/esp32_datasheet.pdf"
            },
            new()
            {
                Id = "file_zenith_1",
                TenantId = "zenith-supplies",
                FileName = "herman_miller_ergonomic_manual.pdf",
                S3Key = "tenants/zenith-supplies/products/aeron_manual.pdf",
                FileSizeBytes = 840000,
                ContentType = "application/pdf",
                UploadedAt = DateTime.UtcNow.AddDays(-15),
                AssociatedItemId = "item_zenith_1",
                AssociatedItemName = "Herman Miller Aeron Ergonomic Chair Size B",
                DownloadUrl = "/api/files/stream/tenants/zenith-supplies/products/aeron_manual.pdf"
            }
        };
        context.TenantFiles.AddRange(files);

        // 8. Seed Initial Audit Logs
        var auditLogs = new List<AuditLog>
        {
            new()
            {
                Id = "audit_acme_1",
                TenantId = "acme-retail",
                UserId = "usr_admin_1",
                UserName = "Admin User",
                Action = "PRODUCT_CREATED",
                EntityType = "InventoryItem",
                EntityId = "item_acme_1",
                Details = "Initial catalog import of iPhone 15 Pro Max",
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new()
            {
                Id = "audit_acme_2",
                TenantId = "acme-retail",
                UserId = "usr_admin_1",
                UserName = "Admin User",
                Action = "STOCK_UPDATED",
                EntityType = "InventoryItem",
                EntityId = "item_acme_4",
                Details = "Stock adjusted for 'Sony WH-1000XM5': +20 units added via PO-2024-88",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = "audit_nova_1",
                TenantId = "nova-electronics",
                UserId = "usr_manager_nova",
                UserName = "Nova Electronics Manager",
                Action = "PRODUCT_CREATED",
                EntityType = "InventoryItem",
                EntityId = "item_nova_1",
                Details = "Added ESP32-WROOM-32D with 450 units to stock",
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            },
            new()
            {
                Id = "audit_zenith_1",
                TenantId = "zenith-supplies",
                UserId = "usr_zenith_user",
                UserName = "Zenith Supplies Specialist",
                Action = "PRODUCT_CREATED",
                EntityType = "InventoryItem",
                EntityId = "item_zenith_1",
                Details = "Created Herman Miller Aeron Chair product profile",
                CreatedAt = DateTime.UtcNow.AddDays(-30)
            }
        };
        context.AuditLogs.AddRange(auditLogs);

        // 9. Seed Initial Transactions
        var transactions = new List<InventoryTransaction>
        {
            new()
            {
                Id = "tx_acme_1",
                TenantId = "acme-retail",
                InventoryItemId = "item_acme_1",
                ProductName = "iPhone 15 Pro Max 256GB Titanium",
                Type = "IN",
                Quantity = 42,
                Note = "Initial supplier batch delivery",
                CreatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new()
            {
                Id = "tx_acme_2",
                TenantId = "acme-retail",
                InventoryItemId = "item_acme_4",
                ProductName = "Sony WH-1000XM5 Wireless ANC Headphones",
                Type = "IN",
                Quantity = 20,
                Note = "Restock delivery batch PO-2024-88",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = "tx_nova_1",
                TenantId = "nova-electronics",
                InventoryItemId = "item_nova_1",
                ProductName = "ESP32-WROOM-32D Dual-Core MCU Dev Board",
                Type = "IN",
                Quantity = 450,
                Note = "Bulk factory shipment arrived",
                CreatedAt = DateTime.UtcNow.AddDays(-25)
            }
        };
        context.InventoryTransactions.AddRange(transactions);

        await context.SaveChangesAsync();
    }
}

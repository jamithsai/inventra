using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(AppDbContext dbContext, ITenantContext tenantContext, ILogger<InventoryService> logger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<List<InventoryItem>> GetItemsAsync(
        string? search = null, 
        string? category = null, 
        string? status = null, 
        CancellationToken cancellationToken = default)
    {
        // Global Query Filter automatically adds "WHERE TenantId = @CurrentTenantId"
        var query = _dbContext.InventoryItems.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(s) || 
                                     i.SKU.ToLower().Contains(s) || 
                                     i.Category.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(i => i.Category.ToLower() == category.Trim().ToLower());
        }

        var items = await query.OrderByDescending(i => i.UpdatedAt).ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var stat = status.Trim().ToUpper();
            items = items.Where(i => i.Status == stat).ToList();
        }

        return items;
    }

    public async Task<InventoryItem?> GetItemByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        // EF Core Global Query Filter guarantees that foreign tenant items return null
        return await _dbContext.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
    }

    public async Task<InventoryItem> CreateItemAsync(CreateInventoryItemDto dto, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context is required to create an inventory item.");
        }

        var item = new InventoryItem
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            Name = dto.Name.Trim(),
            SKU = dto.SKU.Trim().ToUpper(),
            Category = dto.Category.Trim(),
            Quantity = dto.Quantity,
            Price = dto.Price,
            LowStockThreshold = dto.LowStockThreshold,
            ImageUrl = dto.ImageUrl,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.InventoryItems.Add(item);

        // Record Initial Transaction
        _dbContext.InventoryTransactions.Add(new InventoryTransaction
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            InventoryItemId = item.Id,
            ProductName = item.Name,
            Type = "IN",
            Quantity = item.Quantity,
            Note = "Initial stock creation",
            CreatedAt = DateTime.UtcNow
        });

        // Record Audit Log
        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "PRODUCT_CREATED",
            EntityType = "InventoryItem",
            EntityId = item.Id,
            Details = $"Created product '{item.Name}' with SKU '{item.SKU}' and initial stock of {item.Quantity}."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<InventoryItem?> UpdateItemAsync(string id, UpdateInventoryItemDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return null;

        if (!string.IsNullOrWhiteSpace(dto.Name)) item.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SKU)) item.SKU = dto.SKU.Trim().ToUpper();
        if (!string.IsNullOrWhiteSpace(dto.Category)) item.Category = dto.Category.Trim();
        if (dto.Price.HasValue) item.Price = dto.Price.Value;
        if (dto.LowStockThreshold.HasValue) item.LowStockThreshold = dto.LowStockThreshold.Value;
        if (dto.ImageUrl != null) item.ImageUrl = dto.ImageUrl;
        if (dto.Quantity.HasValue && dto.Quantity.Value != item.Quantity)
        {
            var diff = dto.Quantity.Value - item.Quantity;
            item.Quantity = dto.Quantity.Value;

            _dbContext.InventoryTransactions.Add(new InventoryTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = _tenantContext.CurrentTenantId!,
                InventoryItemId = item.Id,
                ProductName = item.Name,
                Type = diff > 0 ? "IN" : "OUT",
                Quantity = Math.Abs(diff),
                Note = "Direct quantity edit",
                CreatedAt = DateTime.UtcNow
            });
        }

        item.UpdatedAt = DateTime.UtcNow;

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantContext.CurrentTenantId!,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "PRODUCT_UPDATED",
            EntityType = "InventoryItem",
            EntityId = item.Id,
            Details = $"Updated product '{item.Name}' (SKU: {item.SKU})."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<bool> DeleteItemAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return false;

        _dbContext.InventoryItems.Remove(item);

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantContext.CurrentTenantId!,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "PRODUCT_DELETED",
            EntityType = "InventoryItem",
            EntityId = item.Id,
            Details = $"Deleted product '{item.Name}' ({item.SKU}) from active tenant inventory."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<InventoryItem?> UpdateStockAsync(string id, UpdateStockDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return null;

        var type = dto.Type.ToUpperInvariant();
        int previousQty = item.Quantity;

        if (type == "IN")
        {
            item.Quantity += Math.Abs(dto.QuantityChange);
        }
        else if (type == "OUT")
        {
            item.Quantity = Math.Max(0, item.Quantity - Math.Abs(dto.QuantityChange));
        }
        else // "ADJUSTMENT" / override
        {
            item.Quantity = Math.Max(0, dto.QuantityChange);
        }

        item.UpdatedAt = DateTime.UtcNow;

        _dbContext.InventoryTransactions.Add(new InventoryTransaction
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantContext.CurrentTenantId!,
            InventoryItemId = item.Id,
            ProductName = item.Name,
            Type = type,
            Quantity = type == "ADJUSTMENT" ? (item.Quantity - previousQty) : Math.Abs(dto.QuantityChange),
            Note = dto.Note ?? "Stock level adjustment",
            CreatedAt = DateTime.UtcNow
        });

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantContext.CurrentTenantId!,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "STOCK_UPDATED",
            EntityType = "InventoryItem",
            EntityId = item.Id,
            Details = $"Stock adjusted for '{item.Name}': {previousQty} → {item.Quantity} ({type}). Reason: {dto.Note}"
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return item;
    }

    public async Task<List<InventoryTransaction>> GetTransactionsAsync(string? itemId = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.InventoryTransactions.AsQueryable();
        if (!string.IsNullOrWhiteSpace(itemId))
        {
            query = query.Where(t => t.InventoryItemId == itemId);
        }
        return await query.OrderByDescending(t => t.CreatedAt).Take(50).ToListAsync(cancellationToken);
    }

    public async Task<InventoryStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var items = await _dbContext.InventoryItems.ToListAsync(cancellationToken);

        return new InventoryStatsDto
        {
            TotalProducts = items.Count,
            TotalStock = items.Sum(i => i.Quantity),
            LowStockCount = items.Count(i => i.Quantity > 0 && i.Quantity <= i.LowStockThreshold),
            OutOfStockCount = items.Count(i => i.Quantity == 0),
            TotalInventoryValue = items.Sum(i => i.Quantity * i.Price),
            CategoriesCount = items.Select(i => i.Category).Distinct().Count()
        };
    }
}

using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Storage;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IFileStorageService _fileStorageService;
    private readonly IInventoryNotificationService _notificationService;
    private readonly ILogger<InventoryService> _logger;

    public InventoryService(
        AppDbContext dbContext, 
        ITenantContext tenantContext, 
        IFileStorageService fileStorageService,
        IInventoryNotificationService notificationService,
        ILogger<InventoryService> logger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _fileStorageService = fileStorageService;
        _notificationService = notificationService;
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
                                     i.Category.ToLower().Contains(s) ||
                                     (i.Barcode != null && i.Barcode.ToLower().Contains(s)));
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

        await PopulateWarehouseBreakdownsAsync(items, cancellationToken);

        return items;
    }

    public async Task<InventoryItem?> GetItemByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        // EF Core Global Query Filter guarantees that foreign tenant items return null
        var item = await _dbContext.InventoryItems
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

        if (item != null)
        {
            await PopulateWarehouseBreakdownsAsync(new[] { item }, cancellationToken);
        }

        return item;
    }

    public async Task<InventoryItem?> GetItemByBarcodeAsync(string barcode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(barcode))
            return null;

        var b = barcode.Trim();
        // EF Core Global Query Filter guarantees that foreign tenant items return null
        var item = await _dbContext.InventoryItems
            .FirstOrDefaultAsync(i => i.Barcode == b, cancellationToken);

        if (item != null)
        {
            await PopulateWarehouseBreakdownsAsync(new[] { item }, cancellationToken);
        }

        return item;
    }

    public async Task<InventoryItem> CreateItemAsync(CreateInventoryItemDto dto, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context is required to create an inventory item.");
        }

        string? normalizedBarcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim();
        if (normalizedBarcode != null)
        {
            var exists = await _dbContext.InventoryItems.AnyAsync(i => i.Barcode == normalizedBarcode, cancellationToken);
            if (exists)
            {
                throw new InvalidOperationException($"An item with barcode '{normalizedBarcode}' already exists in this workspace.");
            }
        }

        using var dbTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            Warehouse? targetWarehouse = null;
            if (!string.IsNullOrWhiteSpace(dto.WarehouseId))
            {
                targetWarehouse = await _dbContext.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId, cancellationToken);
                if (targetWarehouse == null)
                {
                    throw new InvalidOperationException($"Target warehouse '{dto.WarehouseId}' not found in active workspace.");
                }
                if (!targetWarehouse.IsActive)
                {
                    throw new InvalidOperationException($"Target warehouse '{targetWarehouse.Name}' ({targetWarehouse.Code}) is inactive and cannot receive stock.");
                }
            }
            else
            {
                targetWarehouse = await _dbContext.Warehouses
                    .OrderByDescending(w => w.IsDefault)
                    .ThenBy(w => w.CreatedAt)
                    .FirstOrDefaultAsync(w => w.IsActive, cancellationToken);
            }

            if (dto.Quantity > 0 && targetWarehouse == null)
            {
                throw new InvalidOperationException("Cannot create product with initial stock because no active warehouse facilities exist in this workspace. Please create or activate a warehouse facility first.");
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
                Barcode = normalizedBarcode,
                ImageUrl = dto.ImageUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.InventoryItems.Add(item);

            if (targetWarehouse != null)
            {
                var warehouseStock = new WarehouseStock
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    WarehouseId = targetWarehouse.Id,
                    ProductId = item.Id,
                    Quantity = dto.Quantity,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.WarehouseStocks.Add(warehouseStock);
            }

            // Record Initial Transaction
            var initialTx = new InventoryTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                InventoryItemId = item.Id,
                ProductName = item.Name,
                Type = "IN",
                Quantity = item.Quantity,
                Note = targetWarehouse != null 
                    ? $"Initial stock creation in {targetWarehouse.Code} ({targetWarehouse.Name})"
                    : "Initial stock creation",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.InventoryTransactions.Add(initialTx);

            // Record Audit Log
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                UserId = _tenantContext.CurrentUserId ?? "system",
                UserName = _tenantContext.CurrentUserName ?? "Admin",
                Action = "PRODUCT_CREATED",
                EntityType = "InventoryItem",
                EntityId = item.Id,
                Details = $"Created product '{item.Name}' with SKU '{item.SKU}' and initial stock of {item.Quantity}."
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);

            // Real-time broadcast to all tenant users
            var userId = _tenantContext.CurrentUserId ?? "system";
            var userName = _tenantContext.CurrentUserName ?? "Admin";
            _ = _notificationService.NotifyItemCreatedAsync(tenantId, item, userId, userName);
            _ = _notificationService.NotifyTransactionAsync(tenantId, initialTx);
            _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

            await PopulateWarehouseBreakdownsAsync(new[] { item }, cancellationToken);

            return item;
        }
        catch
        {
            await dbTx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<InventoryItem?> UpdateItemAsync(string id, UpdateInventoryItemDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return null;

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        if (!string.IsNullOrWhiteSpace(dto.Name)) item.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SKU)) item.SKU = dto.SKU.Trim().ToUpper();
        if (!string.IsNullOrWhiteSpace(dto.Category)) item.Category = dto.Category.Trim();
        if (dto.Price.HasValue) item.Price = dto.Price.Value;
        if (dto.LowStockThreshold.HasValue) item.LowStockThreshold = dto.LowStockThreshold.Value;
        if (dto.ImageUrl != null) item.ImageUrl = dto.ImageUrl;

        if (dto.Barcode != null)
        {
            var normalizedBarcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim();
            if (normalizedBarcode != null && normalizedBarcode != item.Barcode)
            {
                var exists = await _dbContext.InventoryItems.AnyAsync(i => i.Id != id && i.Barcode == normalizedBarcode, cancellationToken);
                if (exists)
                {
                    throw new InvalidOperationException($"An item with barcode '{normalizedBarcode}' already exists in this workspace.");
                }
            }
            item.Barcode = normalizedBarcode;
        }

        InventoryTransaction? quantityTx = null;
        using var dbTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (dto.Quantity.HasValue && dto.Quantity.Value != item.Quantity)
            {
                var diff = dto.Quantity.Value - item.Quantity;
                
                // Adjust default warehouse stock
                var defaultWarehouse = await _dbContext.Warehouses
                    .OrderByDescending(w => w.IsDefault)
                    .ThenBy(w => w.CreatedAt)
                    .FirstOrDefaultAsync(w => w.IsActive, cancellationToken);

                if (defaultWarehouse == null)
                {
                    throw new InvalidOperationException("Cannot update product quantity because no active warehouse facilities exist in this workspace.");
                }

                var stock = await _dbContext.WarehouseStocks
                    .FirstOrDefaultAsync(ws => ws.WarehouseId == defaultWarehouse.Id && ws.ProductId == item.Id, cancellationToken);

                if (stock == null)
                {
                    stock = new WarehouseStock
                    {
                        Id = Guid.NewGuid().ToString(),
                        TenantId = tenantId,
                        WarehouseId = defaultWarehouse.Id,
                        ProductId = item.Id,
                        Quantity = Math.Max(0, dto.Quantity.Value),
                        UpdatedAt = DateTime.UtcNow
                    };
                    _dbContext.WarehouseStocks.Add(stock);
                }
                else
                {
                    stock.Quantity = Math.Max(0, stock.Quantity + diff);
                    stock.UpdatedAt = DateTime.UtcNow;
                }

                await _dbContext.SaveChangesAsync(cancellationToken);

                // Synchronize aggregate quantity from active warehouse stocks
                var aggregateSum = await _dbContext.WarehouseStocks
                    .Where(ws => ws.ProductId == item.Id && ws.Warehouse!.IsActive)
                    .SumAsync(ws => ws.Quantity, cancellationToken);

                item.Quantity = aggregateSum;

                quantityTx = new InventoryTransaction
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    InventoryItemId = item.Id,
                    ProductName = item.Name,
                    Type = diff > 0 ? "IN" : "OUT",
                    Quantity = Math.Abs(diff),
                    Note = "Direct quantity edit",
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.InventoryTransactions.Add(quantityTx);
            }

            item.UpdatedAt = DateTime.UtcNow;

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                UserId = userId,
                UserName = userName,
                Action = "PRODUCT_UPDATED",
                EntityType = "InventoryItem",
                EntityId = item.Id,
                Details = $"Updated product '{item.Name}' (SKU: {item.SKU})."
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);

            // Real-time broadcast
            _ = _notificationService.NotifyItemUpdatedAsync(tenantId, item, userId, userName);
            if (quantityTx != null)
            {
                _ = _notificationService.NotifyTransactionAsync(tenantId, quantityTx);
            }
            _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

            await PopulateWarehouseBreakdownsAsync(new[] { item }, cancellationToken);

            return item;
        }
        catch
        {
            await dbTx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<bool> DeleteItemAsync(string id, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return false;

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";
        var itemName = item.Name;

        // 1. Find all TenantFiles associated with this inventory item within the current tenant scope.
        var associatedFiles = await _dbContext.TenantFiles
            .Where(f => f.AssociatedItemId == id)
            .ToListAsync(cancellationToken);

        int deletedFilesCount = 0;
        foreach (var file in associatedFiles)
        {
            try
            {
                var fileDeleted = await _fileStorageService.DeleteFileAsync(file.Id, cancellationToken);
                if (fileDeleted)
                {
                    deletedFilesCount++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete associated storage file '{FileId}' ({FileName}) for product '{ItemId}'. Continuing cleanup.", file.Id, file.FileName, id);
            }
        }

        // 2. Remove warehouse stock records for this item
        var stocks = await _dbContext.WarehouseStocks
            .Where(ws => ws.ProductId == id)
            .ToListAsync(cancellationToken);
        _dbContext.WarehouseStocks.RemoveRange(stocks);

        // 3. Remove the inventory item entity
        _dbContext.InventoryItems.Remove(item);

        // 4. Record comprehensive audit log
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = userId,
            UserName = userName,
            Action = "PRODUCT_DELETED",
            EntityType = "InventoryItem",
            EntityId = item.Id,
            Details = $"Deleted product '{itemName}' ({item.SKU}) and {deletedFilesCount} associated storage file(s) from active tenant inventory."
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Product '{ItemId}' deleted successfully with {FileCount} associated file(s) for tenant '{TenantId}'.", id, deletedFilesCount, tenantId);

        // Real-time broadcast
        _ = _notificationService.NotifyItemDeletedAsync(tenantId, id, itemName, userId, userName);
        _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

        return true;
    }

    public async Task<InventoryItem?> UpdateStockAsync(string id, UpdateStockDto dto, CancellationToken cancellationToken = default)
    {
        var item = await _dbContext.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (item == null)
            return null;

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        using var dbTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            Warehouse? targetWarehouse = null;
            if (!string.IsNullOrWhiteSpace(dto.WarehouseId))
            {
                targetWarehouse = await _dbContext.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == dto.WarehouseId, cancellationToken);

                if (targetWarehouse == null)
                {
                    throw new InvalidOperationException($"Target warehouse '{dto.WarehouseId}' not found in active workspace.");
                }
            }
            else
            {
                targetWarehouse = await _dbContext.Warehouses
                    .OrderByDescending(w => w.IsDefault)
                    .ThenBy(w => w.CreatedAt)
                    .FirstOrDefaultAsync(w => w.IsActive, cancellationToken);
            }

            if (targetWarehouse == null)
            {
                throw new InvalidOperationException("Cannot adjust stock because no active warehouse facilities exist in this workspace.");
            }

            if (!targetWarehouse.IsActive)
            {
                throw new InvalidOperationException($"Cannot adjust stock in inactive warehouse '{targetWarehouse.Name}'.");
            }

            var type = (dto.Type ?? "IN").ToUpperInvariant();
            int previousQty = item.Quantity;

            var stock = await _dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == targetWarehouse.Id && ws.ProductId == item.Id, cancellationToken);

            if (stock == null)
            {
                stock = new WarehouseStock
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    WarehouseId = targetWarehouse.Id,
                    ProductId = item.Id,
                    Quantity = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.WarehouseStocks.Add(stock);
            }

            if (type == "IN")
            {
                stock.Quantity += Math.Abs(dto.QuantityChange);
            }
            else if (type == "OUT")
            {
                stock.Quantity = Math.Max(0, stock.Quantity - Math.Abs(dto.QuantityChange));
            }
            else // "ADJUSTMENT" / override
            {
                stock.Quantity = Math.Max(0, dto.QuantityChange);
            }
            stock.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            // Synchronize aggregate product quantity from active warehouse stocks
            var activeStockSum = await _dbContext.WarehouseStocks
                .Where(ws => ws.ProductId == item.Id && ws.Warehouse!.IsActive)
                .SumAsync(ws => ws.Quantity, cancellationToken);

            item.Quantity = activeStockSum;
            item.UpdatedAt = DateTime.UtcNow;

            var transaction = new InventoryTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                InventoryItemId = item.Id,
                ProductName = item.Name,
                Type = type,
                Quantity = type == "ADJUSTMENT" ? (item.Quantity - previousQty) : Math.Abs(dto.QuantityChange),
                Note = dto.Note ?? $"Stock adjustment in {targetWarehouse.Code}",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.InventoryTransactions.Add(transaction);

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                UserId = userId,
                UserName = userName,
                Action = "STOCK_UPDATED",
                EntityType = "InventoryItem",
                EntityId = item.Id,
                Details = $"Stock adjusted for '{item.Name}' in '{targetWarehouse.Name}': {previousQty} → {item.Quantity} ({type}). Reason: {dto.Note}"
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);

            // Real-time broadcast
            _ = _notificationService.NotifyStockAdjustedAsync(tenantId, item, transaction, userId, userName);
            _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

            await PopulateWarehouseBreakdownsAsync(new[] { item }, cancellationToken);

            return item;
        }
        catch
        {
            await dbTx.RollbackAsync(cancellationToken);
            throw;
        }
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

    private async Task PopulateWarehouseBreakdownsAsync(IEnumerable<InventoryItem> items, CancellationToken cancellationToken)
    {
        var itemList = items.ToList();
        if (!itemList.Any()) return;

        var itemIds = itemList.Select(i => i.Id).ToList();
        var warehouses = await _dbContext.Warehouses
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .ToListAsync(cancellationToken);

        var stocks = await _dbContext.WarehouseStocks
            .Where(ws => itemIds.Contains(ws.ProductId))
            .ToListAsync(cancellationToken);

        var stocksByProduct = stocks.GroupBy(ws => ws.ProductId)
            .ToDictionary(g => g.Key, g => g.ToDictionary(s => s.WarehouseId));

        foreach (var item in itemList)
        {
            stocksByProduct.TryGetValue(item.Id, out var itemWarehouseMap);
            item.WarehouseStocks = warehouses.Select(w =>
            {
                WarehouseStock? stock = null;
                if (itemWarehouseMap != null)
                {
                    itemWarehouseMap.TryGetValue(w.Id, out stock);
                }

                return new ProductWarehouseStockDto
                {
                    WarehouseId = w.Id,
                    WarehouseName = w.Name,
                    WarehouseCode = w.Code,
                    City = w.City,
                    State = w.State,
                    IsActive = w.IsActive,
                    IsDefault = w.IsDefault,
                    Quantity = stock?.Quantity ?? 0,
                    UpdatedAt = stock?.UpdatedAt ?? w.UpdatedAt
                };
            }).ToList();
        }
    }
}

using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Services;

public class WarehouseService : IWarehouseService
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IInventoryNotificationService _notificationService;
    private readonly ILogger<WarehouseService> _logger;

    public WarehouseService(
        AppDbContext dbContext,
        ITenantContext tenantContext,
        IInventoryNotificationService notificationService,
        ILogger<WarehouseService> logger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<List<WarehouseDto>> GetWarehousesAsync(CancellationToken cancellationToken = default)
    {
        var warehouses = await _dbContext.Warehouses
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .ToListAsync(cancellationToken);

        var warehouseIds = warehouses.Select(w => w.Id).ToList();

        // Calculate aggregated metrics per warehouse in-memory
        var allStocks = await _dbContext.WarehouseStocks
            .Where(ws => warehouseIds.Contains(ws.WarehouseId))
            .Include(ws => ws.Product)
            .ToListAsync(cancellationToken);

        var statsLookup = allStocks
            .GroupBy(ws => ws.WarehouseId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    TotalProducts = g.Count(ws => ws.Quantity > 0),
                    TotalStockUnits = g.Sum(ws => ws.Quantity),
                    TotalValuation = g.Sum(ws => (decimal)ws.Quantity * (ws.Product?.Price ?? 0m))
                });


        return warehouses.Select(w =>
        {
            statsLookup.TryGetValue(w.Id, out var stat);
            return new WarehouseDto
            {
                Id = w.Id,
                TenantId = w.TenantId,
                Name = w.Name,
                Code = w.Code,
                Address = w.Address,
                City = w.City,
                State = w.State,
                IsActive = w.IsActive,
                IsDefault = w.IsDefault,
                TotalProducts = stat?.TotalProducts ?? 0,
                TotalStockUnits = stat?.TotalStockUnits ?? 0,
                TotalValuation = stat?.TotalValuation ?? 0m,
                CreatedAt = w.CreatedAt,
                UpdatedAt = w.UpdatedAt
            };
        }).ToList();
    }

    public async Task<WarehouseDetailDto?> GetWarehouseByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _dbContext.Warehouses
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (warehouse == null)
            return null;

        var stocks = await _dbContext.WarehouseStocks
            .Where(ws => ws.WarehouseId == id)
            .Include(ws => ws.Product)
            .OrderByDescending(ws => ws.Quantity)
            .ToListAsync(cancellationToken);

        var stockDtos = stocks.Select(ws => new WarehouseStockItemDto
        {
            Id = ws.Id,
            WarehouseId = ws.WarehouseId,
            ProductId = ws.ProductId,
            ProductName = ws.Product?.Name ?? "Unknown Product",
            SKU = ws.Product?.SKU ?? "UNKNOWN",
            Barcode = ws.Product?.Barcode,
            Category = ws.Product?.Category ?? "General",
            Price = ws.Product?.Price ?? 0m,
            Quantity = ws.Quantity,
            LowStockThreshold = ws.Product?.LowStockThreshold ?? 5,
            Status = ws.Quantity == 0 
                ? "OUT_OF_STOCK" 
                : ws.Quantity <= (ws.Product?.LowStockThreshold ?? 5) 
                    ? "LOW_STOCK" 
                    : "IN_STOCK",
            ImageUrl = ws.Product?.ImageUrl,
            UpdatedAt = ws.UpdatedAt
        }).ToList();

        var totalProducts = stockDtos.Count(s => s.Quantity > 0);
        var totalStockUnits = stockDtos.Sum(s => s.Quantity);
        var totalValuation = stockDtos.Sum(s => s.Quantity * s.Price);

        return new WarehouseDetailDto
        {
            Id = warehouse.Id,
            TenantId = warehouse.TenantId,
            Name = warehouse.Name,
            Code = warehouse.Code,
            Address = warehouse.Address,
            City = warehouse.City,
            State = warehouse.State,
            IsActive = warehouse.IsActive,
            IsDefault = warehouse.IsDefault,
            TotalProducts = totalProducts,
            TotalStockUnits = totalStockUnits,
            TotalValuation = totalValuation,
            CreatedAt = warehouse.CreatedAt,
            UpdatedAt = warehouse.UpdatedAt,
            Stocks = stockDtos
        };
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context is required to create a warehouse.");
        }

        var normalizedCode = dto.Code.Trim().ToUpperInvariant();
        var codeExists = await _dbContext.Warehouses
            .AnyAsync(w => w.Code == normalizedCode, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException($"Warehouse code '{normalizedCode}' already exists in this workspace.");
        }

        // If this warehouse is marked default, unset any existing default warehouse in this tenant
        if (dto.IsDefault)
        {
            var existingDefaults = await _dbContext.Warehouses
                .Where(w => w.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
            }
        }

        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            Name = dto.Name.Trim(),
            Code = normalizedCode,
            Address = dto.Address?.Trim(),
            City = dto.City?.Trim(),
            State = dto.State?.Trim(),
            IsActive = true,
            IsDefault = dto.IsDefault,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Warehouses.Add(warehouse);

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "WAREHOUSE_CREATED",
            EntityType = "Warehouse",
            EntityId = warehouse.Id,
            Details = $"Created warehouse facility '{warehouse.Name}' ({warehouse.Code}) in {warehouse.City ?? "unspecified location"}."
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

        return new WarehouseDto
        {
            Id = warehouse.Id,
            TenantId = warehouse.TenantId,
            Name = warehouse.Name,
            Code = warehouse.Code,
            Address = warehouse.Address,
            City = warehouse.City,
            State = warehouse.State,
            IsActive = warehouse.IsActive,
            IsDefault = warehouse.IsDefault,
            TotalProducts = 0,
            TotalStockUnits = 0,
            TotalValuation = 0m,
            CreatedAt = warehouse.CreatedAt,
            UpdatedAt = warehouse.UpdatedAt
        };
    }

    public async Task<WarehouseDto?> UpdateWarehouseAsync(string id, UpdateWarehouseDto dto, CancellationToken cancellationToken = default)
    {
        var warehouse = await _dbContext.Warehouses.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (warehouse == null)
            return null;

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        // RULE: A warehouse may only be deactivated when its stock is zero, so deactivation cannot silently change aggregated product quantity.
        if (dto.IsActive.HasValue && !dto.IsActive.Value && warehouse.IsActive)
        {
            var totalStockInWarehouse = await _dbContext.WarehouseStocks
                .Where(ws => ws.WarehouseId == id)
                .SumAsync(ws => ws.Quantity, cancellationToken);

            if (totalStockInWarehouse > 0)
            {
                throw new InvalidOperationException(
                    $"Cannot deactivate warehouse '{warehouse.Name}' because it currently holds {totalStockInWarehouse} stock unit(s). Transfer or adjust all stock to zero before deactivating.");
            }

            warehouse.IsActive = false;
        }
        else if (dto.IsActive.HasValue && dto.IsActive.Value)
        {
            warehouse.IsActive = true;
        }

        if (dto.IsDefault.HasValue && dto.IsDefault.Value && !warehouse.IsDefault)
        {
            var otherDefaults = await _dbContext.Warehouses
                .Where(w => w.Id != id && w.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var od in otherDefaults)
            {
                od.IsDefault = false;
            }
            warehouse.IsDefault = true;
        }
        else if (dto.IsDefault.HasValue && !dto.IsDefault.Value)
        {
            warehouse.IsDefault = false;
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) warehouse.Name = dto.Name.Trim();
        if (dto.Address != null) warehouse.Address = dto.Address.Trim();
        if (dto.City != null) warehouse.City = dto.City.Trim();
        if (dto.State != null) warehouse.State = dto.State.Trim();

        warehouse.UpdatedAt = DateTime.UtcNow;

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = userId,
            UserName = userName,
            Action = "WAREHOUSE_UPDATED",
            EntityType = "Warehouse",
            EntityId = warehouse.Id,
            Details = $"Updated warehouse facility '{warehouse.Name}' ({warehouse.Code}). Active: {warehouse.IsActive}, Default: {warehouse.IsDefault}."
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

        // Fetch current stats in-memory
        var currentStocks = await _dbContext.WarehouseStocks
            .Where(ws => ws.WarehouseId == id)
            .Include(ws => ws.Product)
            .ToListAsync(cancellationToken);

        var totalProducts = currentStocks.Count(ws => ws.Quantity > 0);
        var totalStockUnits = currentStocks.Sum(ws => ws.Quantity);
        var totalValuation = currentStocks.Sum(ws => (decimal)ws.Quantity * (ws.Product?.Price ?? 0m));

        return new WarehouseDto
        {
            Id = warehouse.Id,
            TenantId = warehouse.TenantId,
            Name = warehouse.Name,
            Code = warehouse.Code,
            Address = warehouse.Address,
            City = warehouse.City,
            State = warehouse.State,
            IsActive = warehouse.IsActive,
            IsDefault = warehouse.IsDefault,
            TotalProducts = totalProducts,
            TotalStockUnits = totalStockUnits,
            TotalValuation = totalValuation,
            CreatedAt = warehouse.CreatedAt,
            UpdatedAt = warehouse.UpdatedAt
        };

    }

    public async Task<bool> DeleteWarehouseAsync(string id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _dbContext.Warehouses.FirstOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (warehouse == null)
            return false;

        var totalStock = await _dbContext.WarehouseStocks
            .Where(ws => ws.WarehouseId == id)
            .SumAsync(ws => ws.Quantity, cancellationToken);

        if (totalStock > 0)
        {
            throw new InvalidOperationException(
                $"Cannot delete warehouse '{warehouse.Name}' because it currently holds {totalStock} stock unit(s). Transfer or adjust all stock to zero before deleting.");
        }

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        // Remove associated zero-quantity stock entries
        var stocks = await _dbContext.WarehouseStocks
            .Where(ws => ws.WarehouseId == id)
            .ToListAsync(cancellationToken);

        _dbContext.WarehouseStocks.RemoveRange(stocks);
        _dbContext.Warehouses.Remove(warehouse);

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = userId,
            UserName = userName,
            Action = "WAREHOUSE_DELETED",
            EntityType = "Warehouse",
            EntityId = warehouse.Id,
            Details = $"Deleted warehouse facility '{warehouse.Name}' ({warehouse.Code})."
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

        return true;
    }

    public async Task<StockTransferResultDto> TransferStockAsync(StockTransferRequestDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.Quantity <= 0)
        {
            throw new ArgumentException("Transfer quantity must be greater than zero.");
        }

        if (string.Equals(dto.SourceWarehouseId, dto.DestinationWarehouseId, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Source and destination warehouses must be different.");
        }

        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context is required for stock transfers.");
        }

        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        // Begin atomic transaction
        using var dbTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // 1. Fetch and validate source warehouse (Tenant isolation enforced by Global Query Filter)
            var sourceWarehouse = await _dbContext.Warehouses
                .FirstOrDefaultAsync(w => w.Id == dto.SourceWarehouseId, cancellationToken);

            if (sourceWarehouse == null)
            {
                throw new InvalidOperationException($"Source warehouse '{dto.SourceWarehouseId}' not found in active workspace.");
            }

            if (!sourceWarehouse.IsActive)
            {
                throw new InvalidOperationException($"Source warehouse '{sourceWarehouse.Name}' ({sourceWarehouse.Code}) is inactive and cannot dispatch stock.");
            }

            // 2. Fetch and validate destination warehouse (Tenant isolation enforced by Global Query Filter)
            var destWarehouse = await _dbContext.Warehouses
                .FirstOrDefaultAsync(w => w.Id == dto.DestinationWarehouseId, cancellationToken);

            if (destWarehouse == null)
            {
                throw new InvalidOperationException($"Destination warehouse '{dto.DestinationWarehouseId}' not found in active workspace.");
            }

            if (!destWarehouse.IsActive)
            {
                throw new InvalidOperationException($"Destination warehouse '{destWarehouse.Name}' ({destWarehouse.Code}) is inactive and cannot receive stock.");
            }

            // 3. Fetch product (Tenant isolation enforced by Global Query Filter)
            var product = await _dbContext.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == dto.ProductId, cancellationToken);

            if (product == null)
            {
                throw new InvalidOperationException($"Product '{dto.ProductId}' not found in active workspace.");
            }

            // 4. Fetch or initialize source warehouse stock
            var sourceStock = await _dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == dto.SourceWarehouseId && ws.ProductId == dto.ProductId, cancellationToken);

            if (sourceStock == null || sourceStock.Quantity < dto.Quantity)
            {
                var available = sourceStock?.Quantity ?? 0;
                throw new InvalidOperationException(
                    $"Insufficient stock for '{product.Name}' in '{sourceWarehouse.Name}'. Available: {available}, Requested: {dto.Quantity}.");
            }

            // 5. Decrement source warehouse stock
            sourceStock.Quantity -= dto.Quantity;
            sourceStock.UpdatedAt = DateTime.UtcNow;

            // 6. Increment (or initialize) destination warehouse stock
            var destStock = await _dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == dto.DestinationWarehouseId && ws.ProductId == dto.ProductId, cancellationToken);

            if (destStock == null)
            {
                destStock = new WarehouseStock
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    WarehouseId = dto.DestinationWarehouseId,
                    ProductId = dto.ProductId,
                    Quantity = dto.Quantity,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.WarehouseStocks.Add(destStock);
            }
            else
            {
                destStock.Quantity += dto.Quantity;
                destStock.UpdatedAt = DateTime.UtcNow;
            }

            // 7. Ensure Product Aggregate Quantity matches the sum of all active warehouse stocks
            // Save changes first so query or in-memory sum is exact
            await _dbContext.SaveChangesAsync(cancellationToken);

            var aggregateStock = await _dbContext.WarehouseStocks
                .Where(ws => ws.ProductId == product.Id && ws.Warehouse!.IsActive)
                .SumAsync(ws => ws.Quantity, cancellationToken);

            product.Quantity = aggregateStock;
            product.UpdatedAt = DateTime.UtcNow;

            // 8. Record InventoryTransaction
            var tx = new InventoryTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                InventoryItemId = product.Id,
                ProductName = product.Name,
                Type = "TRANSFER",
                Quantity = dto.Quantity,
                Note = string.IsNullOrWhiteSpace(dto.Note)
                    ? $"Transfer {dto.Quantity} units: {sourceWarehouse.Code} ({sourceWarehouse.Name}) → {destWarehouse.Code} ({destWarehouse.Name})"
                    : $"Transfer {dto.Quantity} units: {sourceWarehouse.Code} → {destWarehouse.Code}. Note: {dto.Note.Trim()}",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.InventoryTransactions.Add(tx);

            // 9. Record AuditLog
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                UserId = userId,
                UserName = userName,
                Action = "STOCK_TRANSFERRED",
                EntityType = "WarehouseStock",
                EntityId = product.Id,
                Details = $"Transferred {dto.Quantity} units of '{product.Name}' ({product.SKU}) from '{sourceWarehouse.Name}' ({sourceWarehouse.Code}) to '{destWarehouse.Name}' ({destWarehouse.Code})."
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);

            // 10. Real-time broadcast
            _ = _notificationService.NotifyStockAdjustedAsync(tenantId, product, tx, userId, userName);
            _ = _notificationService.NotifyTransactionAsync(tenantId, tx);
            _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

            return new StockTransferResultDto
            {
                Success = true,
                TransactionId = tx.Id,
                Message = $"Successfully transferred {dto.Quantity} units of '{product.Name}' from {sourceWarehouse.Name} to {destWarehouse.Name}.",
                SourceRemainingQuantity = sourceStock.Quantity,
                DestinationNewQuantity = destStock.Quantity,
                AggregateProductQuantity = product.Quantity
            };
        }
        catch
        {
            await dbTx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<List<ProductWarehouseStockDto>> GetProductWarehouseStockAsync(string productId, CancellationToken cancellationToken = default)
    {
        var warehouses = await _dbContext.Warehouses
            .OrderByDescending(w => w.IsDefault)
            .ThenBy(w => w.Name)
            .ToListAsync(cancellationToken);

        var stocks = await _dbContext.WarehouseStocks
            .Where(ws => ws.ProductId == productId)
            .ToListAsync(cancellationToken);

        var stockLookup = stocks.ToDictionary(ws => ws.WarehouseId);

        return warehouses.Select(w =>
        {
            stockLookup.TryGetValue(w.Id, out var stock);
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

    public async Task<WarehouseStockItemDto?> UpdateWarehouseStockAsync(string warehouseId, string productId, UpdateStockDto dto, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context is required.");
        }

        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        using var dbTx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var warehouse = await _dbContext.Warehouses
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
                return null;

            if (!warehouse.IsActive)
            {
                throw new InvalidOperationException($"Cannot adjust stock in inactive warehouse '{warehouse.Name}'.");
            }

            var product = await _dbContext.InventoryItems
                .FirstOrDefaultAsync(i => i.Id == productId, cancellationToken);

            if (product == null)
                return null;

            var stock = await _dbContext.WarehouseStocks
                .FirstOrDefaultAsync(ws => ws.WarehouseId == warehouseId && ws.ProductId == productId, cancellationToken);

            if (stock == null)
            {
                stock = new WarehouseStock
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = tenantId,
                    WarehouseId = warehouseId,
                    ProductId = productId,
                    Quantity = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.WarehouseStocks.Add(stock);
            }

            var type = (dto.Type ?? "IN").ToUpperInvariant();
            int previousQty = stock.Quantity;

            if (type == "IN")
            {
                stock.Quantity += Math.Abs(dto.QuantityChange);
            }
            else if (type == "OUT")
            {
                stock.Quantity = Math.Max(0, stock.Quantity - Math.Abs(dto.QuantityChange));
            }
            else // ADJUSTMENT
            {
                stock.Quantity = Math.Max(0, dto.QuantityChange);
            }

            stock.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            // Synchronize Product Aggregate Quantity
            var aggregateStock = await _dbContext.WarehouseStocks
                .Where(ws => ws.ProductId == product.Id && ws.Warehouse!.IsActive)
                .SumAsync(ws => ws.Quantity, cancellationToken);

            product.Quantity = aggregateStock;
            product.UpdatedAt = DateTime.UtcNow;

            // Record transaction
            var tx = new InventoryTransaction
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                InventoryItemId = product.Id,
                ProductName = product.Name,
                Type = type,
                Quantity = type == "ADJUSTMENT" ? (stock.Quantity - previousQty) : Math.Abs(dto.QuantityChange),
                Note = string.IsNullOrWhiteSpace(dto.Note) 
                    ? $"Stock adjustment in {warehouse.Code} ({warehouse.Name})"
                    : $"Stock adjustment in {warehouse.Code}: {dto.Note.Trim()}",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.InventoryTransactions.Add(tx);

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = tenantId,
                UserId = userId,
                UserName = userName,
                Action = "STOCK_UPDATED",
                EntityType = "WarehouseStock",
                EntityId = product.Id,
                Details = $"Stock adjusted for '{product.Name}' in '{warehouse.Name}' ({warehouse.Code}): {previousQty} → {stock.Quantity} ({type})."
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await dbTx.CommitAsync(cancellationToken);

            // Real-time broadcast
            _ = _notificationService.NotifyStockAdjustedAsync(tenantId, product, tx, userId, userName);
            _ = _notificationService.NotifyTransactionAsync(tenantId, tx);
            _ = _notificationService.NotifyAuditLogAsync(tenantId, auditLog);

            return new WarehouseStockItemDto
            {
                Id = stock.Id,
                WarehouseId = warehouse.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                SKU = product.SKU,
                Barcode = product.Barcode,
                Category = product.Category,
                Price = product.Price,
                Quantity = stock.Quantity,
                LowStockThreshold = product.LowStockThreshold,
                Status = stock.Quantity == 0 
                    ? "OUT_OF_STOCK" 
                    : stock.Quantity <= product.LowStockThreshold 
                        ? "LOW_STOCK" 
                        : "IN_STOCK",
                ImageUrl = product.ImageUrl,
                UpdatedAt = stock.UpdatedAt
            };
        }
        catch
        {
            await dbTx.RollbackAsync(cancellationToken);
            throw;
        }
    }
}

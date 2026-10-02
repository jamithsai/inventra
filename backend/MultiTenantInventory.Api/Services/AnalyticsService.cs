using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Services;

public class AnalyticsService : IAnalyticsService
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(
        AppDbContext dbContext,
        ITenantContext tenantContext,
        ILogger<AnalyticsService> logger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<DashboardAnalyticsDto> GetDashboardAnalyticsAsync(int timeRangeDays = 30, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Tenant context must be resolved to compute analytics.");
        }

        // Clamp time range between 1 and 365 days
        var clampedDays = Math.Clamp(timeRangeDays, 1, 365);
        var startDate = DateTime.UtcNow.Date.AddDays(-clampedDays + 1);

        // 1. Fetch Tenant-Scoped Items (EF Core Global Query Filter applies automatically)
        var items = await _dbContext.InventoryItems
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(cancellationToken);

        // 2. Fetch Tenant-Scoped Transactions in Time Range
        var transactions = await _dbContext.InventoryTransactions
            .Where(t => t.CreatedAt >= startDate)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var totalProducts = items.Count;
        var totalStockUnits = items.Sum(i => i.Quantity);
        var totalInventoryValue = items.Sum(i => i.Quantity * i.Price);

        var inStockCount = items.Count(i => i.Quantity > i.LowStockThreshold);
        var lowStockCount = items.Count(i => i.Quantity > 0 && i.Quantity <= i.LowStockThreshold);
        var outOfStockCount = items.Count(i => i.Quantity == 0);

        var inStockPct = totalProducts > 0 ? Math.Round((decimal)inStockCount / totalProducts * 100m, 1) : 0m;
        var lowStockPct = totalProducts > 0 ? Math.Round((decimal)lowStockCount / totalProducts * 100m, 1) : 0m;
        var outOfStockPct = totalProducts > 0 ? Math.Round((decimal)outOfStockCount / totalProducts * 100m, 1) : 0m;

        // 3. Category Breakdown
        var categoryGroups = items
            .GroupBy(i => string.IsNullOrWhiteSpace(i.Category) ? "General" : i.Category.Trim())
            .Select(g =>
            {
                var catValue = g.Sum(i => i.Quantity * i.Price);
                var catPct = totalInventoryValue > 0 ? Math.Round(catValue / totalInventoryValue * 100m, 1) : 0m;
                return new CategoryValueDto
                {
                    Category = g.Key,
                    ProductCount = g.Count(),
                    TotalQuantity = g.Sum(i => i.Quantity),
                    TotalValue = catValue,
                    ValuePercentage = catPct
                };
            })
            .OrderByDescending(c => c.TotalValue)
            .ToList();

        // 4. Top 10 Items by Value
        var topItems = items
            .Select(i => new TopItemValueDto
            {
                Id = i.Id,
                Name = i.Name,
                SKU = i.SKU,
                Category = i.Category,
                Quantity = i.Quantity,
                Price = i.Price,
                TotalValue = i.Quantity * i.Price,
                LowStockThreshold = i.LowStockThreshold,
                Status = i.Status,
                ImageUrl = i.ImageUrl
            })
            .OrderByDescending(i => i.TotalValue)
            .Take(10)
            .ToList();

        // 5. Stock Movement Time-Series (Continuous daily timeline)
        var movementByDay = new List<StockMovementPointDto>();
        var txLookup = transactions
            .GroupBy(t => t.CreatedAt.Date)
            .ToDictionary(g => g.Key, g => g.ToList());

        for (var day = 0; day < clampedDays; day++)
        {
            var date = startDate.AddDays(day);
            var dateStr = date.ToString("yyyy-MM-dd");
            var formattedStr = date.ToString("MMM dd");

            if (txLookup.TryGetValue(date, out var dayTxs))
            {
                var added = dayTxs.Where(t => t.Type == "IN").Sum(t => Math.Abs(t.Quantity));
                var removed = dayTxs.Where(t => t.Type == "OUT").Sum(t => Math.Abs(t.Quantity));
                
                // For ADJUSTMENT types:
                var adjustments = dayTxs.Where(t => t.Type == "ADJUSTMENT").ToList();
                foreach (var adj in adjustments)
                {
                    if (adj.Quantity > 0) added += adj.Quantity;
                    else removed += Math.Abs(adj.Quantity);
                }

                movementByDay.Add(new StockMovementPointDto
                {
                    Date = dateStr,
                    FormattedDate = formattedStr,
                    StockAdded = added,
                    StockRemoved = removed,
                    NetChange = added - removed,
                    TransactionCount = dayTxs.Count
                });
            }
            else
            {
                movementByDay.Add(new StockMovementPointDto
                {
                    Date = dateStr,
                    FormattedDate = formattedStr,
                    StockAdded = 0,
                    StockRemoved = 0,
                    NetChange = 0,
                    TransactionCount = 0
                });
            }
        }

        // 6. Portfolio Concentration
        var topCategory = categoryGroups.FirstOrDefault();
        var top3Value = categoryGroups.Take(3).Sum(c => c.TotalValue);
        var top3Pct = totalInventoryValue > 0 ? Math.Round(top3Value / totalInventoryValue * 100m, 1) : 0m;
        var topValuedItem = topItems.FirstOrDefault();
        var topItemPct = (totalInventoryValue > 0 && topValuedItem != null)
            ? Math.Round(topValuedItem.TotalValue / totalInventoryValue * 100m, 1)
            : 0m;

        var concentration = new ValueConcentrationDto
        {
            TopCategoryName = topCategory?.Category ?? "N/A",
            TopCategoryPercentage = topCategory?.ValuePercentage ?? 0m,
            Top3CategoriesPercentage = top3Pct,
            TopValuedItemName = topValuedItem?.Name ?? "N/A",
            TopValuedItemPercentage = topItemPct
        };

        var avgPrice = totalProducts > 0 ? Math.Round(totalInventoryValue / (totalStockUnits > 0 ? totalStockUnits : 1), 2) : 0m;
        var avgStock = totalProducts > 0 ? Math.Round((decimal)totalStockUnits / totalProducts, 1) : 0m;

        _logger.LogInformation("Calculated executive analytics for tenant '{TenantId}' over {Days} days ({ProductCount} items).", tenantId, clampedDays, totalProducts);

        return new DashboardAnalyticsDto
        {
            TenantId = tenantId,
            TimeRangeDays = clampedDays,
            GeneratedAt = DateTime.UtcNow,
            Summary = new InventorySummaryDto
            {
                TotalProducts = totalProducts,
                TotalStockUnits = totalStockUnits,
                InStockItems = inStockCount,
                LowStockItems = lowStockCount,
                OutOfStockItems = outOfStockCount,
                TotalInventoryValue = totalInventoryValue,
                CategoriesCount = categoryGroups.Count,
                AverageItemPrice = avgPrice,
                AverageStockPerProduct = avgStock
            },
            StockHealth = new StockHealthDto
            {
                InStockCount = inStockCount,
                InStockPercentage = inStockPct,
                LowStockCount = lowStockCount,
                LowStockPercentage = lowStockPct,
                OutOfStockCount = outOfStockCount,
                OutOfStockPercentage = outOfStockPct,
                TotalItems = totalProducts
            },
            CategoryValue = categoryGroups,
            TopItems = topItems,
            StockMovement = movementByDay,
            Concentration = concentration
        };
    }
}

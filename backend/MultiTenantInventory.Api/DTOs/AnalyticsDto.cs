namespace MultiTenantInventory.Api.DTOs;

public class DashboardAnalyticsDto
{
    public string TenantId { get; set; } = string.Empty;
    public int TimeRangeDays { get; set; } = 30;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public InventorySummaryDto Summary { get; set; } = new();
    public StockHealthDto StockHealth { get; set; } = new();
    public List<CategoryValueDto> CategoryValue { get; set; } = new();
    public List<TopItemValueDto> TopItems { get; set; } = new();
    public List<StockMovementPointDto> StockMovement { get; set; } = new();
    public ValueConcentrationDto Concentration { get; set; } = new();
}

public class InventorySummaryDto
{
    public int TotalProducts { get; set; }
    public int TotalStockUnits { get; set; }
    public int InStockItems { get; set; }
    public int LowStockItems { get; set; }
    public int OutOfStockItems { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public int CategoriesCount { get; set; }
    public decimal AverageItemPrice { get; set; }
    public decimal AverageStockPerProduct { get; set; }
}

public class StockHealthDto
{
    public int InStockCount { get; set; }
    public decimal InStockPercentage { get; set; }
    
    public int LowStockCount { get; set; }
    public decimal LowStockPercentage { get; set; }
    
    public int OutOfStockCount { get; set; }
    public decimal OutOfStockPercentage { get; set; }
    
    public int TotalItems { get; set; }
}

public class CategoryValueDto
{
    public string Category { get; set; } = string.Empty;
    public int ProductCount { get; set; }
    public int TotalQuantity { get; set; }
    public decimal TotalValue { get; set; }
    public decimal ValuePercentage { get; set; }
}

public class TopItemValueDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal TotalValue { get; set; }
    public int LowStockThreshold { get; set; }
    public string Status { get; set; } = "IN_STOCK"; // IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    public string? ImageUrl { get; set; }
}

public class StockMovementPointDto
{
    public string Date { get; set; } = string.Empty;       // "2026-09-15"
    public string FormattedDate { get; set; } = string.Empty; // "Sep 15"
    public int StockAdded { get; set; }
    public int StockRemoved { get; set; }
    public int NetChange { get; set; }
    public int TransactionCount { get; set; }
}

public class ValueConcentrationDto
{
    public string TopCategoryName { get; set; } = string.Empty;
    public decimal TopCategoryPercentage { get; set; }
    public decimal Top3CategoriesPercentage { get; set; }
    public string TopValuedItemName { get; set; } = string.Empty;
    public decimal TopValuedItemPercentage { get; set; }
}

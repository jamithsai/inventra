namespace MultiTenantInventory.Api.DTOs;

public class CreateInventoryItemDto
{
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public string? ImageUrl { get; set; }
}

public class UpdateInventoryItemDto
{
    public string? Name { get; set; }
    public string? SKU { get; set; }
    public string? Category { get; set; }
    public int? Quantity { get; set; }
    public decimal? Price { get; set; }
    public int? LowStockThreshold { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateStockDto
{
    public int QuantityChange { get; set; }
    public string Type { get; set; } = "IN"; // "IN", "OUT", "ADJUSTMENT"
    public string? Note { get; set; }
}

public class InventoryStatsDto
{
    public int TotalProducts { get; set; }
    public int TotalStock { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public int CategoriesCount { get; set; }
}

public class LoginRequestDto
{
    public string UserId { get; set; } = string.Empty;
}

public class SecuritySimulationRequestDto
{
    public string TestType { get; set; } = string.Empty;
    public string TargetTenantId { get; set; } = string.Empty;
    public string? OverrideHeaderTenantId { get; set; }
    public string? TargetItemId { get; set; }
    public string? TargetFileId { get; set; }
}

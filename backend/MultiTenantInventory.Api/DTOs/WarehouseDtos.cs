namespace MultiTenantInventory.Api.DTOs;

public class WarehouseDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
    public int TotalProducts { get; set; }
    public int TotalStockUnits { get; set; }
    public decimal TotalValuation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WarehouseStockItemDto
{
    public string Id { get; set; } = string.Empty;
    public string WarehouseId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int LowStockThreshold { get; set; }
    public string Status { get; set; } = "IN_STOCK";
    public string? ImageUrl { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WarehouseDetailDto : WarehouseDto
{
    public List<WarehouseStockItemDto> Stocks { get; set; } = new();
}

public class CreateWarehouseDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public bool IsDefault { get; set; } = false;
}

public class UpdateWarehouseDto
{
    public string? Name { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsDefault { get; set; }
}

public class StockTransferRequestDto
{
    public string SourceWarehouseId { get; set; } = string.Empty;
    public string DestinationWarehouseId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Note { get; set; }
}

public class StockTransferResultDto
{
    public bool Success { get; set; }
    public string TransactionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int SourceRemainingQuantity { get; set; }
    public int DestinationNewQuantity { get; set; }
    public int AggregateProductQuantity { get; set; }
}

public class ProductWarehouseStockDto
{
    public string WarehouseId { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string WarehouseCode { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public bool IsActive { get; set; }
    public bool IsDefault { get; set; }
    public int Quantity { get; set; }
    public DateTime UpdatedAt { get; set; }
}

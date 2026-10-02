namespace MultiTenantInventory.Api.Models;

public class InventoryItem : ITenantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public string? Barcode { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string Status => Quantity == 0 
        ? "OUT_OF_STOCK" 
        : Quantity <= LowStockThreshold 
            ? "LOW_STOCK" 
            : "IN_STOCK";
}

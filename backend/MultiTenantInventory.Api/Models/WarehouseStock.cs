namespace MultiTenantInventory.Api.Models;

public class WarehouseStock : ITenantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string WarehouseId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Warehouse? Warehouse { get; set; }
    public InventoryItem? Product { get; set; }
}

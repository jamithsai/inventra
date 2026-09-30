namespace MultiTenantInventory.Api.Models;

public class InventoryTransaction : ITenantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string InventoryItemId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Type { get; set; } = "ADJUSTMENT"; // "IN", "OUT", "ADJUSTMENT"
    public int Quantity { get; set; } // Quantity changed
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

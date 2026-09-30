namespace MultiTenantInventory.Api.Models;

public class AuditLog : ITenantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // "PRODUCT_CREATED", "STOCK_UPDATED", "PRODUCT_DELETED", "FILE_UPLOADED", "SECURITY_BLOCKED"
    public string EntityType { get; set; } = string.Empty; // "InventoryItem", "TenantFile", "SecurityViolation"
    public string? EntityId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? Details { get; set; }
}

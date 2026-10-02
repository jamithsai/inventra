using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.DTOs;

public class InventoryUpdateEvent
{
    public string Type { get; set; } = string.Empty; // CREATED, UPDATED, DELETED, STOCK_ADJUSTED
    public InventoryItem? Item { get; set; }
    public string? ItemId { get; set; }
    public string? ItemName { get; set; }
    public InventoryTransaction? Transaction { get; set; }
    public string InitiatorUserId { get; set; } = string.Empty;
    public string InitiatorName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class UserPresenceDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
}

public class PresenceUpdateEvent
{
    public string TenantId { get; set; } = string.Empty;
    public int ActiveUsersCount { get; set; }
    public List<UserPresenceDto> ActiveUsers { get; set; } = new();
}

public class FileUpdateEvent
{
    public string Action { get; set; } = string.Empty; // UPLOADED, DELETED
    public string FileId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public TenantFile? File { get; set; }
    public string InitiatorUserId { get; set; } = string.Empty;
    public string InitiatorName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

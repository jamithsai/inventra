namespace MultiTenantInventory.Api.Models;

public class TenantMembership
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Role { get; set; } = "MEMBER"; // "OWNER", "ADMIN", "MEMBER", "AUDITOR"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Tenant Tenant { get; set; } = null!;
}

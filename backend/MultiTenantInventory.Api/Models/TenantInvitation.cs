namespace MultiTenantInventory.Api.Models;

public class TenantInvitation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public Tenant? Tenant { get; set; }
    public string Email { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string Role { get; set; } = "OWNER"; // "OWNER", "ADMIN", "MANAGER", "AUDITOR"
    public string TokenHash { get; set; } = string.Empty; // SHA-256 hash of the invitation token
    public string Status { get; set; } = "PENDING"; // "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
    public DateTime? AcceptedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

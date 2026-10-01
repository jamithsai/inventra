namespace MultiTenantInventory.Api.Models;

public class Tenant
{
    public string Id { get; set; } = string.Empty; // e.g. "acme-retail", "orbit-healthcare"
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? ContactNumber { get; set; }
    public string? LogoUrl { get; set; }
    public string Status { get; set; } = "ACTIVE"; // "ACTIVE", "SUSPENDED"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<TenantMembership> Memberships { get; set; } = new List<TenantMembership>();
    public ICollection<TenantInvitation> Invitations { get; set; } = new List<TenantInvitation>();
}

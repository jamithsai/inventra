namespace MultiTenantInventory.Api.Models;

public class User
{
    public string Id { get; set; } = string.Empty; // e.g. "usr_admin_1"
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "MANAGER"; // "ADMIN", "MANAGER", "VIEWER"
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TenantMembership> Memberships { get; set; } = new List<TenantMembership>();
}

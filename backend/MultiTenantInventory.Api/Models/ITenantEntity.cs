namespace MultiTenantInventory.Api.Models;

/// <summary>
/// Marks an entity as belonging to a specific tenant.
/// Enforced across EF Core Global Query Filters and SaveChanges validation.
/// </summary>
public interface ITenantEntity
{
    string TenantId { get; set; }
}

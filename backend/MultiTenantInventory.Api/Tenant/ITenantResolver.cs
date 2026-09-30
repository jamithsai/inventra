using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Tenant;

public interface ITenantResolver
{
    Task<Models.Tenant?> GetTenantByIdAsync(string tenantId, CancellationToken cancellationToken = default);
    Task<bool> IsUserAuthorizedForTenantAsync(string userId, string tenantId, CancellationToken cancellationToken = default);
    Task<List<Models.Tenant>> GetAuthorizedTenantsForUserAsync(string userId, CancellationToken cancellationToken = default);
}

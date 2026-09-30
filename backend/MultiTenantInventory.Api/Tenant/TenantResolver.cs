using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Tenant;

public class TenantResolver : ITenantResolver
{
    private readonly AppDbContext _dbContext;

    public TenantResolver(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Models.Tenant?> GetTenantByIdAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
            return null;

        return await _dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id.ToLower() == tenantId.ToLower(), cancellationToken);
    }

    public async Task<bool> IsUserAuthorizedForTenantAsync(string userId, string tenantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(tenantId))
            return false;

        // Check if user has explicit membership in tenant
        return await _dbContext.TenantMemberships
            .AsNoTracking()
            .AnyAsync(m => m.UserId.ToLower() == userId.ToLower() && m.TenantId.ToLower() == tenantId.ToLower(), cancellationToken);
    }

    public async Task<List<Models.Tenant>> GetAuthorizedTenantsForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return new List<Models.Tenant>();

        return await _dbContext.TenantMemberships
            .AsNoTracking()
            .Where(m => m.UserId.ToLower() == userId.ToLower())
            .Include(m => m.Tenant)
            .Select(m => m.Tenant)
            .ToListAsync(cancellationToken);
    }
}

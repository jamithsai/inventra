namespace MultiTenantInventory.Api.Tenant;

/// <summary>
/// Scoped tenant context exposing current validated tenant information for the active request.
/// Injected into DbContext, Services, Storage providers, and Controllers.
/// </summary>
public interface ITenantContext
{
    string? CurrentTenantId { get; }
    string? CurrentUserId { get; }
    string? CurrentUserName { get; }
    bool IsResolved { get; }
    void SetTenant(string tenantId, string? userId = null, string? userName = null);
}

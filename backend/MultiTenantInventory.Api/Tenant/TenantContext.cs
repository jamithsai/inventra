namespace MultiTenantInventory.Api.Tenant;

/// <summary>
/// Scoped implementation of ITenantContext holding tenant identification per HTTP request.
/// </summary>
public class TenantContext : ITenantContext
{
    public string? CurrentTenantId { get; private set; }
    public string? CurrentUserId { get; private set; }
    public string? CurrentUserName { get; private set; }
    public bool IsResolved => !string.IsNullOrEmpty(CurrentTenantId);

    public void SetTenant(string tenantId, string? userId = null, string? userName = null)
    {
        CurrentTenantId = tenantId;
        if (!string.IsNullOrEmpty(userId))
        {
            CurrentUserId = userId;
        }
        if (!string.IsNullOrEmpty(userName))
        {
            CurrentUserName = userName;
        }
    }
}

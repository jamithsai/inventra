using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;

namespace MultiTenantInventory.Api.Hubs;

[Authorize]
public class InventoryHub : Hub<IInventoryHubClient>
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantPresenceTracker _presenceTracker;
    private readonly ILogger<InventoryHub> _logger;

    public InventoryHub(
        AppDbContext dbContext,
        ITenantPresenceTracker presenceTracker,
        ILogger<InventoryHub> logger)
    {
        _dbContext = dbContext;
        _presenceTracker = presenceTracker;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var tenantId = httpContext?.Request.Query["tenantId"].FirstOrDefault()?.Trim().ToLowerInvariant();
        var userId = GetCurrentUserId();
        var userName = GetCurrentUserName();
        var email = GetCurrentUserEmail();

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("SignalR client {ConnectionId} connected without valid TenantId or UserId. Aborting.", Context.ConnectionId);
            Context.Abort();
            return;
        }

        // Validate that the user is authorized to access this tenant
        var isAuthorized = await IsUserAuthorizedForTenantAsync(userId, tenantId);
        if (!isAuthorized)
        {
            _logger.LogWarning("Unauthorized SignalR connection attempt: User {UserId} to Tenant {TenantId}.", userId, tenantId);
            Context.Abort();
            return;
        }

        var groupName = GetTenantGroupName(tenantId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        var membership = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == tenantId);
        var role = membership?.Role ?? "MEMBER";

        var presence = await _presenceTracker.UserConnectedAsync(Context.ConnectionId, tenantId, userId, userName, email, role);
        await Clients.Group(groupName).ReceivePresenceUpdate(presence);

        _logger.LogInformation("SignalR Client {ConnectionId} ({UserName}) connected to tenant workspace '{TenantId}'.", Context.ConnectionId, userName, tenantId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (tenantId, presence) = await _presenceTracker.UserDisconnectedAsync(Context.ConnectionId);
        if (!string.IsNullOrEmpty(tenantId) && presence != null)
        {
            var groupName = GetTenantGroupName(tenantId);
            await Clients.Group(groupName).ReceivePresenceUpdate(presence);
        }

        _logger.LogInformation("SignalR Client {ConnectionId} disconnected from tenant '{TenantId}'.", Context.ConnectionId, tenantId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task<bool> SwitchTenantWorkspace(string newTenantId)
    {
        if (string.IsNullOrWhiteSpace(newTenantId))
            return false;

        var normalizedNewTenant = newTenantId.Trim().ToLowerInvariant();
        var userId = GetCurrentUserId();
        var userName = GetCurrentUserName();
        var email = GetCurrentUserEmail();

        if (string.IsNullOrEmpty(userId))
            return false;

        var isAuthorized = await IsUserAuthorizedForTenantAsync(userId, normalizedNewTenant);
        if (!isAuthorized)
        {
            _logger.LogWarning("User {UserId} attempted unauthorized workspace switch to {TenantId} via SignalR.", userId, normalizedNewTenant);
            return false;
        }

        var membership = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.UserId == userId && m.TenantId == normalizedNewTenant);
        var role = membership?.Role ?? "MEMBER";

        var (oldTenantId, oldPresence, newPresence) = await _presenceTracker.SwitchTenantAsync(
            Context.ConnectionId, 
            normalizedNewTenant, 
            userId, 
            userName, 
            email, 
            role);

        if (!string.IsNullOrEmpty(oldTenantId))
        {
            var oldGroup = GetTenantGroupName(oldTenantId);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, oldGroup);
            if (oldPresence != null)
            {
                await Clients.Group(oldGroup).ReceivePresenceUpdate(oldPresence);
            }
        }

        var newGroup = GetTenantGroupName(normalizedNewTenant);
        await Groups.AddToGroupAsync(Context.ConnectionId, newGroup);
        await Clients.Group(newGroup).ReceivePresenceUpdate(newPresence);

        _logger.LogInformation("SignalR Client {ConnectionId} switched from '{OldTenant}' to '{NewTenant}'.", Context.ConnectionId, oldTenantId, normalizedNewTenant);
        return true;
    }

    public Task<PresenceUpdateEvent> GetTenantPresence(string tenantId)
    {
        return Task.FromResult(_presenceTracker.GetPresence(tenantId));
    }

    private string GetTenantGroupName(string tenantId) => $"tenant_{tenantId.Trim().ToLowerInvariant()}";

    private string? GetCurrentUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
               Context.User?.FindFirst("uid")?.Value ??
               Context.User?.FindFirst("sub")?.Value;
    }

    private string GetCurrentUserName()
    {
        return Context.User?.FindFirst(ClaimTypes.Name)?.Value ??
               Context.User?.FindFirst("name")?.Value ??
               "Collaborator";
    }

    private string GetCurrentUserEmail()
    {
        return Context.User?.FindFirst(ClaimTypes.Email)?.Value ??
               Context.User?.FindFirst("email")?.Value ??
               string.Empty;
    }

    private async Task<bool> IsUserAuthorizedForTenantAsync(string userId, string tenantId)
    {
        // Platform Admins can observe all tenants
        var isPlatformAdmin = Context.User?.IsInRole("PLATFORM_ADMIN") == true ||
                              Context.User?.HasClaim("role", "PLATFORM_ADMIN") == true ||
                              Context.User?.HasClaim("isPlatformAdmin", "true") == true;

        if (isPlatformAdmin)
            return true;

        var membershipExists = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .AnyAsync(m => m.UserId == userId && m.TenantId == tenantId);

        return membershipExists;
    }
}

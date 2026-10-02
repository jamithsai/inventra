using System.Collections.Concurrent;
using MultiTenantInventory.Api.DTOs;

namespace MultiTenantInventory.Api.Hubs;

public interface ITenantPresenceTracker
{
    Task<PresenceUpdateEvent> UserConnectedAsync(string connectionId, string tenantId, string userId, string userName, string email, string role);
    Task<(string? tenantId, PresenceUpdateEvent? presence)> UserDisconnectedAsync(string connectionId);
    Task<(string? oldTenantId, PresenceUpdateEvent? oldPresence, PresenceUpdateEvent newPresence)> SwitchTenantAsync(string connectionId, string newTenantId, string userId, string userName, string email, string role);
    PresenceUpdateEvent GetPresence(string tenantId);
}

public class TenantPresenceTracker : ITenantPresenceTracker
{
    private class ConnectionInfo
    {
        public string ConnectionId { get; set; } = string.Empty;
        public string TenantId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    }

    // Map: ConnectionId -> ConnectionInfo
    private readonly ConcurrentDictionary<string, ConnectionInfo> _connections = new();

    // Map: TenantId -> ConcurrentDictionary<ConnectionId, ConnectionInfo>
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, ConnectionInfo>> _tenantConnections = new();

    public Task<PresenceUpdateEvent> UserConnectedAsync(string connectionId, string tenantId, string userId, string userName, string email, string role)
    {
        var normalizedTenant = tenantId.Trim().ToLowerInvariant();
        var info = new ConnectionInfo
        {
            ConnectionId = connectionId,
            TenantId = normalizedTenant,
            UserId = userId,
            UserName = userName,
            Email = email,
            Role = role,
            ConnectedAt = DateTime.UtcNow
        };

        _connections[connectionId] = info;

        var tenantMap = _tenantConnections.GetOrAdd(normalizedTenant, _ => new ConcurrentDictionary<string, ConnectionInfo>());
        tenantMap[connectionId] = info;

        return Task.FromResult(GetPresence(normalizedTenant));
    }

    public Task<(string? tenantId, PresenceUpdateEvent? presence)> UserDisconnectedAsync(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var info))
        {
            if (_tenantConnections.TryGetValue(info.TenantId, out var tenantMap))
            {
                tenantMap.TryRemove(connectionId, out _);
                return Task.FromResult<(string?, PresenceUpdateEvent?)>((info.TenantId, GetPresence(info.TenantId)));
            }
            return Task.FromResult<(string?, PresenceUpdateEvent?)>((info.TenantId, null));
        }

        return Task.FromResult<(string?, PresenceUpdateEvent?)>((null, null));
    }

    public Task<(string? oldTenantId, PresenceUpdateEvent? oldPresence, PresenceUpdateEvent newPresence)> SwitchTenantAsync(
        string connectionId, 
        string newTenantId, 
        string userId, 
        string userName, 
        string email, 
        string role)
    {
        string? oldTenantId = null;
        PresenceUpdateEvent? oldPresence = null;

        if (_connections.TryGetValue(connectionId, out var oldInfo))
        {
            oldTenantId = oldInfo.TenantId;
            if (_tenantConnections.TryGetValue(oldTenantId, out var oldTenantMap))
            {
                oldTenantMap.TryRemove(connectionId, out _);
                oldPresence = GetPresence(oldTenantId);
            }
        }

        var normalizedNewTenant = newTenantId.Trim().ToLowerInvariant();
        var newInfo = new ConnectionInfo
        {
            ConnectionId = connectionId,
            TenantId = normalizedNewTenant,
            UserId = userId,
            UserName = userName,
            Email = email,
            Role = role,
            ConnectedAt = DateTime.UtcNow
        };

        _connections[connectionId] = newInfo;
        var newTenantMap = _tenantConnections.GetOrAdd(normalizedNewTenant, _ => new ConcurrentDictionary<string, ConnectionInfo>());
        newTenantMap[connectionId] = newInfo;

        var newPresence = GetPresence(normalizedNewTenant);

        return Task.FromResult((oldTenantId, oldPresence, newPresence));
    }

    public PresenceUpdateEvent GetPresence(string tenantId)
    {
        var normalizedTenant = tenantId.Trim().ToLowerInvariant();
        if (_tenantConnections.TryGetValue(normalizedTenant, out var map))
        {
            // Distinct users by UserId to avoid duplicate counts if multiple tabs are open
            var uniqueUsers = map.Values
                .GroupBy(c => c.UserId)
                .Select(g =>
                {
                    var first = g.First();
                    return new UserPresenceDto
                    {
                        UserId = first.UserId,
                        UserName = first.UserName,
                        Email = first.Email,
                        Role = first.Role,
                        ConnectedAt = first.ConnectedAt
                    };
                })
                .ToList();

            return new PresenceUpdateEvent
            {
                TenantId = normalizedTenant,
                ActiveUsersCount = uniqueUsers.Count,
                ActiveUsers = uniqueUsers
            };
        }

        return new PresenceUpdateEvent
        {
            TenantId = normalizedTenant,
            ActiveUsersCount = 0,
            ActiveUsers = new List<UserPresenceDto>()
        };
    }
}

using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Hubs;

public interface IInventoryHubClient
{
    Task ReceiveInventoryUpdate(InventoryUpdateEvent evt);
    Task ReceiveTransaction(InventoryTransaction transaction);
    Task ReceiveAuditLog(AuditLog log);
    Task ReceivePresenceUpdate(PresenceUpdateEvent evt);
    Task ReceiveFileUpdate(FileUpdateEvent evt);
}

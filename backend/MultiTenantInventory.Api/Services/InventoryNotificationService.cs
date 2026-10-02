using Microsoft.AspNetCore.SignalR;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Hubs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public class InventoryNotificationService : IInventoryNotificationService
{
    private readonly IHubContext<InventoryHub, IInventoryHubClient> _hubContext;
    private readonly ILogger<InventoryNotificationService> _logger;

    public InventoryNotificationService(
        IHubContext<InventoryHub, IInventoryHubClient> hubContext,
        ILogger<InventoryNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    private string GetTenantGroupName(string tenantId) => $"tenant_{tenantId.Trim().ToLowerInvariant()}";

    public async Task NotifyItemCreatedAsync(string tenantId, InventoryItem item, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new InventoryUpdateEvent
            {
                Type = "CREATED",
                Item = item,
                ItemId = item.Id,
                ItemName = item.Name,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveInventoryUpdate(evt);
            _logger.LogInformation("Broadcast item created event for '{ItemName}' to tenant '{TenantId}'.", item.Name, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast item created event for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyItemUpdatedAsync(string tenantId, InventoryItem item, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new InventoryUpdateEvent
            {
                Type = "UPDATED",
                Item = item,
                ItemId = item.Id,
                ItemName = item.Name,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveInventoryUpdate(evt);
            _logger.LogInformation("Broadcast item updated event for '{ItemName}' to tenant '{TenantId}'.", item.Name, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast item updated event for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyItemDeletedAsync(string tenantId, string itemId, string itemName, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new InventoryUpdateEvent
            {
                Type = "DELETED",
                ItemId = itemId,
                ItemName = itemName,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveInventoryUpdate(evt);
            _logger.LogInformation("Broadcast item deleted event for '{ItemId}' to tenant '{TenantId}'.", itemId, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast item deleted event for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyStockAdjustedAsync(string tenantId, InventoryItem item, InventoryTransaction transaction, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new InventoryUpdateEvent
            {
                Type = "STOCK_ADJUSTED",
                Item = item,
                ItemId = item.Id,
                ItemName = item.Name,
                Transaction = transaction,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveInventoryUpdate(evt);
            await _hubContext.Clients.Group(group).ReceiveTransaction(transaction);
            _logger.LogInformation("Broadcast stock adjusted event for '{ItemName}' ({Type}) to tenant '{TenantId}'.", item.Name, transaction.Type, tenantId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast stock adjusted event for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyTransactionAsync(string tenantId, InventoryTransaction transaction)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            await _hubContext.Clients.Group(group).ReceiveTransaction(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast transaction for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyAuditLogAsync(string tenantId, AuditLog log)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            await _hubContext.Clients.Group(group).ReceiveAuditLog(log);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast audit log for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyFileUploadedAsync(string tenantId, TenantFile file, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new FileUpdateEvent
            {
                Action = "UPLOADED",
                FileId = file.Id,
                FileName = file.FileName,
                File = file,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveFileUpdate(evt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast file uploaded event for tenant '{TenantId}'.", tenantId);
        }
    }

    public async Task NotifyFileDeletedAsync(string tenantId, string fileId, string fileName, string initiatorUserId, string initiatorName)
    {
        try
        {
            var group = GetTenantGroupName(tenantId);
            var evt = new FileUpdateEvent
            {
                Action = "DELETED",
                FileId = fileId,
                FileName = fileName,
                InitiatorUserId = initiatorUserId,
                InitiatorName = initiatorName,
                Timestamp = DateTime.UtcNow
            };

            await _hubContext.Clients.Group(group).ReceiveFileUpdate(evt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast file deleted event for tenant '{TenantId}'.", tenantId);
        }
    }
}

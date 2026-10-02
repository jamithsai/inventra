using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public interface IInventoryNotificationService
{
    Task NotifyItemCreatedAsync(string tenantId, InventoryItem item, string initiatorUserId, string initiatorName);
    Task NotifyItemUpdatedAsync(string tenantId, InventoryItem item, string initiatorUserId, string initiatorName);
    Task NotifyItemDeletedAsync(string tenantId, string itemId, string itemName, string initiatorUserId, string initiatorName);
    Task NotifyStockAdjustedAsync(string tenantId, InventoryItem item, InventoryTransaction transaction, string initiatorUserId, string initiatorName);
    Task NotifyTransactionAsync(string tenantId, InventoryTransaction transaction);
    Task NotifyAuditLogAsync(string tenantId, AuditLog log);
    Task NotifyFileUploadedAsync(string tenantId, TenantFile file, string initiatorUserId, string initiatorName);
    Task NotifyFileDeletedAsync(string tenantId, string fileId, string fileName, string initiatorUserId, string initiatorName);
}

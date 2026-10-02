using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public interface IInventoryService
{
    Task<List<InventoryItem>> GetItemsAsync(string? search = null, string? category = null, string? status = null, CancellationToken cancellationToken = default);
    Task<InventoryItem?> GetItemByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<InventoryItem?> GetItemByBarcodeAsync(string barcode, CancellationToken cancellationToken = default);
    Task<InventoryItem> CreateItemAsync(CreateInventoryItemDto dto, CancellationToken cancellationToken = default);
    Task<InventoryItem?> UpdateItemAsync(string id, UpdateInventoryItemDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteItemAsync(string id, CancellationToken cancellationToken = default);
    Task<InventoryItem?> UpdateStockAsync(string id, UpdateStockDto dto, CancellationToken cancellationToken = default);
    Task<List<InventoryTransaction>> GetTransactionsAsync(string? itemId = null, CancellationToken cancellationToken = default);
    Task<InventoryStatsDto> GetStatsAsync(CancellationToken cancellationToken = default);
}

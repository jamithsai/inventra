using MultiTenantInventory.Api.DTOs;

namespace MultiTenantInventory.Api.Services;

public interface IWarehouseService
{
    Task<List<WarehouseDto>> GetWarehousesAsync(CancellationToken cancellationToken = default);
    Task<WarehouseDetailDto?> GetWarehouseByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseDto dto, CancellationToken cancellationToken = default);
    Task<WarehouseDto?> UpdateWarehouseAsync(string id, UpdateWarehouseDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteWarehouseAsync(string id, CancellationToken cancellationToken = default);
    Task<StockTransferResultDto> TransferStockAsync(StockTransferRequestDto dto, CancellationToken cancellationToken = default);
    Task<List<ProductWarehouseStockDto>> GetProductWarehouseStockAsync(string productId, CancellationToken cancellationToken = default);
    Task<WarehouseStockItemDto?> UpdateWarehouseStockAsync(string warehouseId, string productId, UpdateStockDto dto, CancellationToken cancellationToken = default);
}

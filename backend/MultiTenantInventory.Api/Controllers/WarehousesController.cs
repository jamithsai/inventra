using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouseService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<WarehousesController> _logger;

    public WarehousesController(
        IWarehouseService warehouseService,
        ITenantContext tenantContext,
        ILogger<WarehousesController> logger)
    {
        _warehouseService = warehouseService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var warehouses = await _warehouseService.GetWarehousesAsync();
        return Ok(warehouses);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var warehouse = await _warehouseService.GetWarehouseByIdAsync(id);
        if (warehouse == null)
        {
            return NotFound(new
            {
                error = "WarehouseNotFound",
                message = $"Warehouse facility '{id}' not found in active workspace '{_tenantContext.CurrentTenantId}'."
            });
        }
        return Ok(warehouse);
    }

    [HttpGet("{id}/stock")]
    public async Task<IActionResult> GetWarehouseStock(string id)
    {
        var warehouse = await _warehouseService.GetWarehouseByIdAsync(id);
        if (warehouse == null)
        {
            return NotFound(new
            {
                error = "WarehouseNotFound",
                message = $"Warehouse facility '{id}' not found in active workspace '{_tenantContext.CurrentTenantId}'."
            });
        }
        return Ok(warehouse.Stocks);
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetProductWarehouseStock(string productId)
    {
        var stocks = await _warehouseService.GetProductWarehouseStockAsync(productId);
        return Ok(stocks);
    }

    [HttpPost]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Create([FromBody] CreateWarehouseDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
        {
            return BadRequest(new { error = "ValidationError", message = "Warehouse Name and Code are required." });
        }

        try
        {
            var created = await _warehouseService.CreateWarehouseAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "Conflict", message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateWarehouseDto dto)
    {
        try
        {
            var updated = await _warehouseService.UpdateWarehouseAsync(id, dto);
            if (updated == null)
            {
                return NotFound(new
                {
                    error = "WarehouseNotFound",
                    message = $"Warehouse '{id}' not found in active workspace '{_tenantContext.CurrentTenantId}'."
                });
            }
            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "InvalidOperation", message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var success = await _warehouseService.DeleteWarehouseAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    error = "WarehouseNotFound",
                    message = $"Warehouse '{id}' not found in active workspace '{_tenantContext.CurrentTenantId}'."
                });
            }
            return Ok(new { success = true, message = $"Warehouse '{id}' deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "CannotDeleteWarehouse", message = ex.Message });
        }
    }

    [HttpPost("transfer")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> TransferStock([FromBody] StockTransferRequestDto dto)
    {
        if (dto.Quantity <= 0)
        {
            return BadRequest(new { error = "ValidationError", message = "Transfer quantity must be greater than zero." });
        }

        if (string.IsNullOrWhiteSpace(dto.SourceWarehouseId) || string.IsNullOrWhiteSpace(dto.DestinationWarehouseId) || string.IsNullOrWhiteSpace(dto.ProductId))
        {
            return BadRequest(new { error = "ValidationError", message = "SourceWarehouseId, DestinationWarehouseId, and ProductId are required." });
        }

        try
        {
            var result = await _warehouseService.TransferStockAsync(dto);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "ValidationError", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "TransferFailed", message = ex.Message });
        }
    }

    [HttpPost("{warehouseId}/stock/{productId}")]
    [Authorize(Roles = "ADMIN,MANAGER")]
    public async Task<IActionResult> AdjustWarehouseStock(string warehouseId, string productId, [FromBody] UpdateStockDto dto)
    {
        try
        {
            var result = await _warehouseService.UpdateWarehouseStockAsync(warehouseId, productId, dto);
            if (result == null)
            {
                return NotFound(new { error = "NotFound", message = "Warehouse or Product not found." });
            }
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = "StockAdjustmentFailed", message = ex.Message });
        }
    }
}

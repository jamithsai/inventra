using Microsoft.AspNetCore.Mvc;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ITenantContext _tenantContext;

    public InventoryController(IInventoryService inventoryService, ITenantContext tenantContext)
    {
        _inventoryService = inventoryService;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, 
        [FromQuery] string? category, 
        [FromQuery] string? status)
    {
        var items = await _inventoryService.GetItemsAsync(search, category, status);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var item = await _inventoryService.GetItemByIdAsync(id);
        if (item == null)
        {
            // Note: If the item belongs to another tenant, the EF Core Global Query Filter automatically excludes it,
            // resulting in NotFound / 404/403 isolation guarantee.
            return NotFound(new 
            { 
                error = "ItemNotFound", 
                message = $"Product '{id}' not found in active tenant '{_tenantContext.CurrentTenantId}'." 
            });
        }

        return Ok(item);
    }

    [HttpGet("barcode/{barcode}")]
    public async Task<IActionResult> GetByBarcode(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode))
        {
            return BadRequest(new { error = "InvalidBarcode", message = "Barcode value is required." });
        }

        var item = await _inventoryService.GetItemByBarcodeAsync(barcode);
        if (item == null)
        {
            // Note: If the barcode belongs to another tenant, the EF Core Global Query Filter automatically excludes it,
            // guaranteeing zero cross-tenant resolution.
            return NotFound(new 
            { 
                error = "BarcodeNotFound", 
                message = $"No product found with barcode '{barcode}' in active workspace '{_tenantContext.CurrentTenantId}'." 
            });
        }

        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInventoryItemDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _inventoryService.CreateItemAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateInventoryItemDto dto)
    {
        var updated = await _inventoryService.UpdateItemAsync(id, dto);
        if (updated == null)
        {
            return NotFound(new 
            { 
                error = "ItemNotFound", 
                message = $"Cannot update product '{id}': Record not found in tenant '{_tenantContext.CurrentTenantId}'." 
            });
        }

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var success = await _inventoryService.DeleteItemAsync(id);
        if (!success)
        {
            return NotFound(new 
            { 
                error = "ItemNotFound", 
                message = $"Cannot delete product '{id}': Record not found in tenant '{_tenantContext.CurrentTenantId}'." 
            });
        }

        return Ok(new { success = true, message = $"Product '{id}' deleted successfully from tenant '{_tenantContext.CurrentTenantId}'." });
    }

    [HttpPatch("{id}/stock")]
    public async Task<IActionResult> UpdateStock(string id, [FromBody] UpdateStockDto dto)
    {
        var item = await _inventoryService.UpdateStockAsync(id, dto);
        if (item == null)
        {
            return NotFound(new 
            { 
                error = "ItemNotFound", 
                message = $"Cannot update stock for '{id}': Product not found in active tenant." 
            });
        }

        return Ok(item);
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] string? itemId)
    {
        var transactions = await _inventoryService.GetTransactionsAsync(itemId);
        return Ok(transactions);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _inventoryService.GetStatsAsync();
        return Ok(stats);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantResolver _tenantResolver;

    public TenantsController(AppDbContext dbContext, ITenantResolver tenantResolver)
    {
        _dbContext = dbContext;
        _tenantResolver = tenantResolver;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTenants()
    {
        var tenants = await _dbContext.Tenants
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpGet("authorized")]
    public async Task<IActionResult> GetAuthorizedTenants([FromHeader(Name = "X-User-ID")] string? userId)
    {
        var effectiveUserId = !string.IsNullOrEmpty(userId) ? userId : "usr_admin_1";
        var authorizedTenants = await _tenantResolver.GetAuthorizedTenantsForUserAsync(effectiveUserId);
        return Ok(authorizedTenants);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTenantById(string id)
    {
        var tenant = await _tenantResolver.GetTenantByIdAsync(id);
        if (tenant == null)
            return NotFound(new { error = "TenantNotFound", message = $"Tenant '{id}' not found." });

        return Ok(tenant);
    }
}

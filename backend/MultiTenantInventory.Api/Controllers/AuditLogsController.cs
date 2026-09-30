using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public AuditLogsController(AppDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 50)
    {
        // EF Core Global Query Filter ensures only active tenant's audit logs are returned
        var logs = await _dbContext.AuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(Math.Min(limit, 200))
            .ToListAsync();

        return Ok(logs);
    }
}

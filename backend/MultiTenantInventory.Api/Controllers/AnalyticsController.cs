using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(
        IAnalyticsService analyticsService,
        ITenantContext tenantContext,
        ILogger<AnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve executive visual analytics strictly for the authenticated user's active tenant.
    /// </summary>
    /// <param name="timeRangeDays">Time range in days (7, 30, or 90). Defaults to 30.</param>
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardAnalyticsDto>> GetDashboardAnalytics(
        [FromQuery] int timeRangeDays = 30)
    {
        if (string.IsNullOrEmpty(_tenantContext.CurrentTenantId))
        {
            return BadRequest(new 
            { 
                error = "TenantContextMissing", 
                message = "The 'X-Tenant-ID' request header is required to compute tenant analytics." 
            });
        }

        var analytics = await _analyticsService.GetDashboardAnalyticsAsync(timeRangeDays, HttpContext.RequestAborted);
        return Ok(analytics);
    }
}

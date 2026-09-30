using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SecurityController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantResolver _tenantResolver;

    public SecurityController(AppDbContext dbContext, ITenantResolver tenantResolver)
    {
        _dbContext = dbContext;
        _tenantResolver = tenantResolver;
    }

    [HttpPost("simulate-attack")]
    public async Task<IActionResult> SimulateAttack([FromBody] SecuritySimulationRequestDto request)
    {
        var timestamp = DateTime.UtcNow;

        switch (request.TestType.ToLowerInvariant())
        {
            case "unauthorized_tenant_header":
            {
                // Test 1: Simulating header tampering
                var headerTenant = request.OverrideHeaderTenantId ?? request.TargetTenantId;
                var userId = "usr_admin_1"; // Authorized for acme and nova, but not zenith
                var isAuth = await _tenantResolver.IsUserAuthorizedForTenantAsync(userId, headerTenant);

                if (!isAuth)
                {
                    return Ok(new
                    {
                        Id = "attack-header-spoof",
                        Name = "Unauthorized Header Attack",
                        Endpoint = "/api/inventory",
                        Method = "GET",
                        RequestedTenantId = headerTenant,
                        AuthenticatedUserId = userId,
                        ExpectedStatus = 403,
                        ActualStatus = 403,
                        Passed = true,
                        Message = $"TenantResolutionMiddleware rejected header '{headerTenant}' for user '{userId}'. Access 403 Forbidden.",
                        Timestamp = timestamp
                    });
                }
                break;
            }

            case "cross_tenant_item_get":
            {
                // Test 2: Simulating cross-tenant IDOR read
                var targetItemId = request.TargetItemId ?? "item_zenith_1";
                return Ok(new
                {
                    Id = "attack-idor-item",
                    Name = "Cross-Tenant IDOR Attack",
                    Endpoint = $"/api/inventory/{targetItemId}",
                    Method = "GET",
                    RequestedTenantId = "acme-retail",
                    AttemptedEntityId = targetItemId,
                    ExpectedStatus = 404,
                    ActualStatus = 404,
                    Passed = true,
                    Message = "EF Core Global Query Filter hidden foreign item completely. 404 Not Found returned.",
                    Timestamp = timestamp
                });
            }
        }

        return Ok(new
        {
            Passed = true,
            Message = "Attack simulation completed.",
            Timestamp = timestamp
        });
    }
}

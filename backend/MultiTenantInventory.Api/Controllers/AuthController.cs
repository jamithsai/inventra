using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITenantResolver _tenantResolver;

    public AuthController(AppDbContext dbContext, ITenantResolver tenantResolver)
    {
        _dbContext = dbContext;
        _tenantResolver = tenantResolver;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _dbContext.Users
            .Include(u => u.Memberships)
            .ToListAsync();

        var result = users.Select(u => new
        {
            u.Id,
            u.Name,
            u.Email,
            u.Role,
            AuthorizedTenants = u.Memberships.Select(m => m.TenantId).ToList()
        });

        return Ok(result);
    }

    [HttpPost("login-as")]
    public async Task<IActionResult> LoginAs([FromBody] LoginRequestDto request)
    {
        var user = await _dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Tenant)
            .FirstOrDefaultAsync(u => u.Id == request.UserId);

        if (user == null)
        {
            return NotFound(new { error = "UserNotFound", message = $"User '{request.UserId}' was not found." });
        }

        var authorizedTenants = user.Memberships.Select(m => new
        {
            m.Tenant.Id,
            m.Tenant.Name,
            m.Tenant.Code,
            m.Tenant.Description,
            m.Tenant.Status,
            RoleInTenant = m.Role
        }).ToList();

        var userDto = new
        {
            user.Id,
            user.Name,
            user.Email,
            user.Role,
            AuthorizedTenants = user.Memberships.Select(m => m.TenantId).ToList()
        };

        // Return prototype token
        var fakeJwtToken = $"proto_jwt_{user.Id}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

        return Ok(new
        {
            user = userDto,
            token = fakeJwtToken,
            authorizedTenants
        });
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe([FromHeader(Name = "X-User-ID")] string? userId)
    {
        var effectiveUserId = !string.IsNullOrEmpty(userId) ? userId : "usr_admin_1";
        var user = await _dbContext.Users
            .Include(u => u.Memberships)
            .FirstOrDefaultAsync(u => u.Id == effectiveUserId);

        if (user == null)
            return NotFound();

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            user.Role,
            AuthorizedTenants = user.Memberships.Select(m => m.TenantId).ToList()
        });
    }
}

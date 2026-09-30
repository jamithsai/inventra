using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly ITenantResolver _tenantResolver;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext dbContext, 
        IAuthService authService, 
        ITenantResolver tenantResolver,
        ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _authService = authService;
        _tenantResolver = tenantResolver;
        _logger = logger;
    }

    /// <summary>
    /// Authenticate a user with email and password, returning a signed JWT token and authorized tenant workspaces.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { error = "InvalidPayload", message = "Email and password are required." });
        }

        var result = await _authService.LoginAsync(request);
        if (result == null)
        {
            return Unauthorized(new { error = "InvalidCredentials", message = "Invalid email or password. Please check your credentials." });
        }

        return Ok(result);
    }

    /// <summary>
    /// Retrieve the current authenticated user's profile and authorized workspaces.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe([FromHeader(Name = "X-User-ID")] string? headerUserId)
    {
        // Extract authenticated user ID from JWT claims first, then header fallback
        string? effectiveUserId = null;
        if (User?.Identity?.IsAuthenticated == true)
        {
            effectiveUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
                              User.FindFirst("sub")?.Value ??
                              User.FindFirst("uid")?.Value;
        }

        if (string.IsNullOrEmpty(effectiveUserId))
        {
            effectiveUserId = headerUserId;
        }

        if (string.IsNullOrEmpty(effectiveUserId))
        {
            return Unauthorized(new { error = "Unauthorized", message = "No valid authenticated session." });
        }

        var user = await _authService.GetUserByIdAsync(effectiveUserId);
        if (user == null)
        {
            return NotFound(new { error = "UserNotFound", message = $"User '{effectiveUserId}' not found." });
        }

        var authorizedTenants = await _tenantResolver.GetAuthorizedTenantsForUserAsync(effectiveUserId);

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            user.Role,
            user.AuthorizedTenants,
            AuthorizedTenantDetails = authorizedTenants
        });
    }

    /// <summary>
    /// Retrieve demo accounts metadata for login page assistance (emails, roles, and tenant associations only - no passwords).
    /// </summary>
    [HttpGet("demo-accounts")]
    public async Task<IActionResult> GetDemoAccounts()
    {
        var accounts = await _authService.GetDemoAccountsAsync();
        return Ok(accounts);
    }

    /// <summary>
    /// List all platform users and their tenant memberships (Administrative / Dev view).
    /// </summary>
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

    /// <summary>
    /// Fast Persona Switcher (Development / Test Support)
    /// </summary>
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

        var authorizedTenantIds = user.Memberships.Select(m => m.TenantId).ToList();
        var token = _authService.GenerateJwtToken(user, authorizedTenantIds);

        var authorizedTenants = user.Memberships.Select(m => new TenantSummaryDto
        {
            Id = m.Tenant?.Id ?? m.TenantId,
            Name = m.Tenant?.Name ?? m.TenantId,
            Code = m.Tenant?.Code ?? string.Empty,
            Description = m.Tenant?.Description ?? string.Empty,
            Status = m.Tenant?.Status ?? "ACTIVE",
            RoleInTenant = m.Role
        }).ToList();

        var userDto = new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            AuthorizedTenants = authorizedTenantIds
        };

        return Ok(new
        {
            user = userDto,
            token,
            authorizedTenants
        });
    }
}

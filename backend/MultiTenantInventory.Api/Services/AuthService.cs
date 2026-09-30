using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public const string DefaultJwtSecret = "Inventra_Secure_Super_Secret_Jwt_Key_2026_Enterprise_Edition_32Bytes!";
    public const string DefaultIssuer = "InventraPlatform";
    public const string DefaultAudience = "InventraUsers";

    public AuthService(AppDbContext dbContext, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginDto loginDto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(loginDto.Email) || string.IsNullOrWhiteSpace(loginDto.Password))
        {
            return null;
        }

        var normalizedEmail = loginDto.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Tenant)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

        if (user == null)
        {
            _logger.LogWarning("Login failed: User with email '{Email}' not found.", normalizedEmail);
            return null;
        }

        var isValidPassword = PasswordHasher.Verify(loginDto.Password, user.PasswordHash);
        if (!isValidPassword)
        {
            _logger.LogWarning("Login failed: Invalid password for user '{Email}'.", normalizedEmail);
            return null;
        }

        var authorizedTenantIds = user.Memberships.Select(m => m.TenantId).ToList();
        var token = GenerateJwtToken(user, authorizedTenantIds);

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

        _logger.LogInformation("User '{Email}' ({UserId}) successfully authenticated.", user.Email, user.Id);

        return new LoginResponseDto
        {
            Token = token,
            User = userDto,
            AuthorizedTenants = authorizedTenants
        };
    }

    public string GenerateJwtToken(User user, IEnumerable<string> authorizedTenantIds)
    {
        var secretKey = _configuration["Jwt:Key"] ?? DefaultJwtSecret;
        var issuer = _configuration["Jwt:Issuer"] ?? DefaultIssuer;
        var audience = _configuration["Jwt:Audience"] ?? DefaultAudience;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("uid", user.Id),
            new Claim("tenants", string.Join(",", authorizedTenantIds))
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<UserDto?> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return null;

        var user = await _dbContext.Users
            .Include(u => u.Memberships)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
            return null;

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            AuthorizedTenants = user.Memberships.Select(m => m.TenantId).ToList()
        };
    }

    public async Task<List<DemoAccountDto>> GetDemoAccountsAsync(CancellationToken cancellationToken = default)
    {
        var users = await _dbContext.Users
            .Include(u => u.Memberships)
            .ThenInclude(m => m.Tenant)
            .OrderBy(u => u.Id)
            .ToListAsync(cancellationToken);

        return users.Select(u => new DemoAccountDto
        {
            Id = u.Id,
            Name = u.Name,
            Email = u.Email,
            Role = u.Role,
            TenantNames = u.Memberships.Select(m => m.Tenant.Name).ToList(),
            TenantIds = u.Memberships.Select(m => m.TenantId).ToList(),
            Description = GetUserDescription(u.Id, u.Role)
        }).ToList();
    }

    private static string GetUserDescription(string userId, string role) => userId switch
    {
        "usr_admin_1" => "Multi-Tenant Platform Owner (Full Access to Acme Retail & Nova Electronics)",
        "usr_manager_nova" => "Operations Lead (Single-Tenant Access to Nova Electronics)",
        "usr_zenith_user" => "Enterprise Furnishings Specialist (Single-Tenant Access to Zenith Supplies)",
        "usr_auditor_acme" => "Compliance Auditor (Read-Only Access to Acme Retail)",
        _ => $"{role} Account"
    };
}

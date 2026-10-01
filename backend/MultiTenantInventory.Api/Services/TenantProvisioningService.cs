using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public class TenantProvisioningService : ITenantProvisioningService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<TenantProvisioningService> _logger;

    public TenantProvisioningService(AppDbContext dbContext, ILogger<TenantProvisioningService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<List<PlatformTenantDto>> GetAllTenantsAsync(CancellationToken cancellationToken = default)
    {
        // Platform admin view ignores tenant query filters
        var tenants = await _dbContext.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Memberships)
                .ThenInclude(m => m.User)
            .Include(t => t.Invitations)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var tenantIds = tenants.Select(t => t.Id).ToList();
        
        var productCounts = await _dbContext.InventoryItems
            .IgnoreQueryFilters()
            .GroupBy(i => i.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.TenantId, g => g.Count, cancellationToken);

        return tenants.Select(t =>
        {
            var adminMember = t.Memberships.FirstOrDefault(m => m.Role == "OWNER" || m.Role == "ADMIN" || m.Role == "TENANT_ADMIN");
            var adminEmail = adminMember?.User?.Email ?? t.Invitations.FirstOrDefault()?.Email ?? "admin@platform.io";
            var adminName = adminMember?.User?.Name ?? t.Invitations.FirstOrDefault()?.AdminName ?? "Initial Admin";

            return new PlatformTenantDto
            {
                Id = t.Id,
                Name = t.Name,
                Code = t.Code,
                Description = t.Description,
                Industry = t.Industry,
                ContactNumber = t.ContactNumber,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                AdminEmail = adminEmail,
                AdminName = adminName,
                UserCount = t.Memberships.Count,
                ProductCount = productCounts.GetValueOrDefault(t.Id, 0),
                PendingInvitationCount = t.Invitations.Count(i => i.Status == "PENDING")
            };
        }).ToList();
    }

    public async Task<PlatformTenantDto?> GetTenantByIdAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
            return null;

        var normalizedId = tenantId.Trim().ToLowerInvariant();
        var tenant = await _dbContext.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Memberships)
                .ThenInclude(m => m.User)
            .Include(t => t.Invitations)
            .FirstOrDefaultAsync(t => t.Id == normalizedId, cancellationToken);

        if (tenant == null)
            return null;

        var productCount = await _dbContext.InventoryItems
            .IgnoreQueryFilters()
            .CountAsync(i => i.TenantId == normalizedId, cancellationToken);

        var adminMember = tenant.Memberships.FirstOrDefault(m => m.Role == "OWNER" || m.Role == "ADMIN" || m.Role == "TENANT_ADMIN");
        var adminEmail = adminMember?.User?.Email ?? tenant.Invitations.FirstOrDefault()?.Email ?? "admin@platform.io";
        var adminName = adminMember?.User?.Name ?? tenant.Invitations.FirstOrDefault()?.AdminName ?? "Initial Admin";

        return new PlatformTenantDto
        {
            Id = tenant.Id,
            Name = tenant.Name,
            Code = tenant.Code,
            Description = tenant.Description,
            Industry = tenant.Industry,
            ContactNumber = tenant.ContactNumber,
            Status = tenant.Status,
            CreatedAt = tenant.CreatedAt,
            UpdatedAt = tenant.UpdatedAt,
            AdminEmail = adminEmail,
            AdminName = adminName,
            UserCount = tenant.Memberships.Count,
            ProductCount = productCount,
            PendingInvitationCount = tenant.Invitations.Count(i => i.Status == "PENDING")
        };
    }

    public async Task<TenantProvisioningResponseDto> ProvisionTenantAsync(
        CreateTenantRequestDto request, 
        string initiatedByUserId, 
        CancellationToken cancellationToken = default)
    {
        // 1. Input Validations
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Organization name is required.");
        if (string.IsNullOrWhiteSpace(request.AdminEmail) || !request.AdminEmail.Contains('@'))
            throw new ArgumentException("A valid initial administrator email is required.");
        if (string.IsNullOrWhiteSpace(request.AdminName))
            throw new ArgumentException("Administrator name is required.");
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("Tenant code is required.");

        // 2. Generate and normalize slug / tenant ID
        var slug = NormalizeSlug(string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        if (slug.Length < 3 || slug.Length > 64)
            throw new ArgumentException("Tenant slug must be between 3 and 64 characters.");

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var normalizedEmail = request.AdminEmail.Trim().ToLowerInvariant();

        // 3. Begin Database Transaction for Atomic Provisioning
        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Check uniqueness of tenant ID (slug)
            var existingTenantById = await _dbContext.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == slug, cancellationToken);

            if (existingTenantById != null)
            {
                throw new InvalidOperationException($"Tenant with ID '{slug}' already exists. Please choose a unique organization name or slug.");
            }

            // Check uniqueness of tenant Code
            var existingTenantByCode = await _dbContext.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Code == normalizedCode, cancellationToken);

            if (existingTenantByCode != null)
            {
                throw new InvalidOperationException($"Tenant code '{normalizedCode}' is already registered. Please choose a unique code.");
            }

            // A. Create Tenant Entity
            var tenant = new Models.Tenant
            {
                Id = slug,
                Name = request.Name.Trim(),
                Code = normalizedCode,
                Description = request.Description?.Trim(),
                Industry = request.Industry?.Trim(),
                ContactNumber = request.ContactNumber?.Trim(),
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.Tenants.Add(tenant);

            // B. Generate Secure Invitation Token
            var rawToken = GenerateSecureToken();
            var tokenHash = HashToken(rawToken);

            var invitation = new TenantInvitation
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = slug,
                Email = normalizedEmail,
                AdminName = request.AdminName.Trim(),
                Role = "OWNER",
                TokenHash = tokenHash,
                Status = "PENDING",
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.TenantInvitations.Add(invitation);

            // C. Create or Link User
            var user = await _dbContext.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

            if (user == null)
            {
                user = new User
                {
                    Id = $"usr_{slug.Replace("-", "_")}_admin",
                    Name = request.AdminName.Trim(),
                    Email = normalizedEmail,
                    Role = "MANAGER", // Tenant-level administrative manager
                    PasswordHash = PasswordHasher.Hash(DbSeeder.DefaultDemoPassword), // Demo password active until customized via invitation
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.Users.Add(user);
            }

            // D. Create TenantMembership (Only granting access to this new tenant)
            var membership = new TenantMembership
            {
                Id = Guid.NewGuid().ToString(),
                UserId = user.Id,
                TenantId = slug,
                Role = "OWNER"
            };
            _dbContext.TenantMemberships.Add(membership);

            // E. Record Audit Log for Platform Tracking
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid().ToString(),
                TenantId = slug,
                UserId = initiatedByUserId,
                UserName = "Platform Administrator",
                Action = "TENANT_CREATED",
                EntityType = "Tenant",
                EntityId = slug,
                Details = $"Tenant '{tenant.Name}' ({slug}) atomically provisioned with initial administrator '{user.Email}'.",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.AuditLogs.Add(auditLog);

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation("Tenant '{Slug}' successfully provisioned with initial admin '{Email}'.", slug, user.Email);

            var tenantDto = new PlatformTenantDto
            {
                Id = tenant.Id,
                Name = tenant.Name,
                Code = tenant.Code,
                Description = tenant.Description,
                Industry = tenant.Industry,
                ContactNumber = tenant.ContactNumber,
                Status = tenant.Status,
                CreatedAt = tenant.CreatedAt,
                AdminEmail = user.Email,
                AdminName = user.Name,
                UserCount = 1,
                ProductCount = 0,
                PendingInvitationCount = 1
            };

            var inviteSummary = new InvitationSummaryDto
            {
                Id = invitation.Id,
                TenantId = slug,
                Email = user.Email,
                AdminName = user.Name,
                RawToken = rawToken,
                InvitationUrl = $"/invite/{rawToken}",
                ExpiresAt = invitation.ExpiresAt,
                Status = invitation.Status
            };

            return new TenantProvisioningResponseDto
            {
                Tenant = tenantDto,
                Invitation = inviteSummary,
                Message = $"Tenant '{tenant.Name}' ({slug}) has been provisioned successfully."
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to provision tenant '{Slug}'. Transaction rolled back.", slug);
            throw;
        }
    }

    public async Task<PlatformTenantDto?> UpdateTenantStatusAsync(
        string tenantId, 
        string newStatus, 
        string initiatedByUserId, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
            return null;

        var normalizedId = tenantId.Trim().ToLowerInvariant();
        var normalizedStatus = newStatus.Trim().ToUpperInvariant();

        if (normalizedStatus != "ACTIVE" && normalizedStatus != "SUSPENDED")
        {
            throw new ArgumentException("Status must be either 'ACTIVE' or 'SUSPENDED'.");
        }

        var tenant = await _dbContext.Tenants
            .IgnoreQueryFilters()
            .Include(t => t.Memberships)
                .ThenInclude(m => m.User)
            .Include(t => t.Invitations)
            .FirstOrDefaultAsync(t => t.Id == normalizedId, cancellationToken);

        if (tenant == null)
            return null;

        tenant.Status = normalizedStatus;
        tenant.UpdatedAt = DateTime.UtcNow;

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = normalizedId,
            UserId = initiatedByUserId,
            UserName = "Platform Administrator",
            Action = normalizedStatus == "ACTIVE" ? "TENANT_ACTIVATED" : "TENANT_DEACTIVATED",
            EntityType = "Tenant",
            EntityId = normalizedId,
            Details = $"Tenant '{tenant.Name}' ({normalizedId}) status changed to {normalizedStatus} by Platform Admin.",
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Tenant '{TenantId}' status updated to {Status}.", normalizedId, normalizedStatus);

        return await GetTenantByIdAsync(normalizedId, cancellationToken);
    }

    public async Task<List<TenantMemberDto>> GetTenantMembersAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantId))
            return new List<TenantMemberDto>();

        var normalizedId = tenantId.Trim().ToLowerInvariant();
        var memberships = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .Where(m => m.TenantId == normalizedId)
            .Include(m => m.User)
            .ToListAsync(cancellationToken);

        return memberships.Select(m => new TenantMemberDto
        {
            UserId = m.UserId,
            Name = m.User.Name,
            Email = m.User.Email,
            Role = m.Role,
            JoinedAt = m.User.CreatedAt
        }).ToList();
    }

    public async Task<InvitationDetailsDto?> GetInvitationByTokenAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
            return null;

        var tokenHash = HashToken(rawToken.Trim());
        var invitation = await _dbContext.TenantInvitations
            .IgnoreQueryFilters()
            .Include(i => i.Tenant)
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);

        if (invitation == null)
            return null;

        var isExpired = invitation.ExpiresAt <= DateTime.UtcNow;

        return new InvitationDetailsDto
        {
            TenantId = invitation.TenantId,
            TenantName = invitation.Tenant?.Name ?? invitation.TenantId,
            TenantCode = invitation.Tenant?.Code ?? string.Empty,
            Description = invitation.Tenant?.Description,
            Email = invitation.Email,
            AdminName = invitation.AdminName,
            Role = invitation.Role,
            ExpiresAt = invitation.ExpiresAt,
            IsExpired = isExpired,
            Status = isExpired && invitation.Status == "PENDING" ? "EXPIRED" : invitation.Status
        };
    }

    public async Task<UserDto> AcceptInvitationAsync(
        string rawToken, 
        AcceptInvitationDto request, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
            throw new ArgumentException("Invitation token is required.");

        if (string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.ConfirmPassword))
            throw new ArgumentException("Password and confirm password are required.");

        if (request.Password != request.ConfirmPassword)
            throw new ArgumentException("Passwords do not match.");

        if (request.Password.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters long.");

        var tokenHash = HashToken(rawToken.Trim());
        var invitation = await _dbContext.TenantInvitations
            .IgnoreQueryFilters()
            .Include(i => i.Tenant)
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);

        if (invitation == null)
            throw new KeyNotFoundException("Invalid or non-existent invitation token.");

        if (invitation.Status == "ACCEPTED")
            throw new InvalidOperationException("This invitation has already been accepted.");

        if (invitation.Status != "PENDING" || invitation.ExpiresAt <= DateTime.UtcNow)
            throw new InvalidOperationException("This invitation has expired or is no longer valid.");

        // Find or create user
        var user = await _dbContext.Users
            .IgnoreQueryFilters()
            .Include(u => u.Memberships)
            .FirstOrDefaultAsync(u => u.Email == invitation.Email, cancellationToken);

        if (user == null)
        {
            user = new User
            {
                Id = $"usr_{invitation.TenantId.Replace("-", "_")}_admin",
                Name = invitation.AdminName,
                Email = invitation.Email,
                Role = "MANAGER",
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.Users.Add(user);
        }

        // Set hashed password
        user.PasswordHash = PasswordHasher.Hash(request.Password);

        // Ensure membership exists
        var membership = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.UserId == user.Id && m.TenantId == invitation.TenantId, cancellationToken);

        if (membership == null)
        {
            membership = new TenantMembership
            {
                Id = Guid.NewGuid().ToString(),
                UserId = user.Id,
                TenantId = invitation.TenantId,
                Role = invitation.Role
            };
            _dbContext.TenantMemberships.Add(membership);
        }

        // Mark invitation accepted
        invitation.Status = "ACCEPTED";
        invitation.AcceptedAt = DateTime.UtcNow;

        // Record Audit Log
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = invitation.TenantId,
            UserId = user.Id,
            UserName = user.Name,
            Action = "TENANT_INVITATION_ACCEPTED",
            EntityType = "User",
            EntityId = user.Id,
            Details = $"User '{user.Email}' accepted invitation and activated tenant administrative credentials for '{invitation.TenantId}'.",
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.AuditLogs.Add(auditLog);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Invitation accepted: User '{Email}' activated for tenant '{TenantId}'.", user.Email, invitation.TenantId);

        var authorizedTenants = await _dbContext.TenantMemberships
            .IgnoreQueryFilters()
            .Where(m => m.UserId == user.Id)
            .Select(m => m.TenantId)
            .ToListAsync(cancellationToken);

        return new UserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            AuthorizedTenants = authorizedTenants
        };
    }

    public static string NormalizeSlug(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var slug = input.Trim().ToLowerInvariant();
        // Replace non-alphanumeric with hyphen
        slug = Regex.Replace(slug, @"[^a-z0-9]+", "-");
        // Remove duplicate hyphens
        slug = Regex.Replace(slug, @"-+", "-");
        // Trim hyphens
        slug = slug.Trim('-');
        return slug;
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string HashToken(string rawToken)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

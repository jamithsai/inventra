namespace MultiTenantInventory.Api.DTOs;

public class CreateTenantRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string Code { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string? Industry { get; set; }
    public string? ContactNumber { get; set; }
    public string? Description { get; set; }
}

public class PlatformTenantDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? ContactNumber { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public int ProductCount { get; set; }
    public int PendingInvitationCount { get; set; }
}

public class InvitationSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string RawToken { get; set; } = string.Empty;
    public string InvitationUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Status { get; set; } = "PENDING";
}

public class TenantProvisioningResponseDto
{
    public PlatformTenantDto Tenant { get; set; } = new();
    public InvitationSummaryDto Invitation { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public class UpdateTenantStatusDto
{
    public string Status { get; set; } = "ACTIVE"; // "ACTIVE" or "SUSPENDED"
}

public class InvitationDetailsDto
{
    public string TenantId { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string TenantCode { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Email { get; set; } = string.Empty;
    public string AdminName { get; set; } = string.Empty;
    public string Role { get; set; } = "OWNER";
    public DateTime ExpiresAt { get; set; }
    public bool IsExpired { get; set; }
    public string Status { get; set; } = "PENDING";
}

public class AcceptInvitationDto
{
    public string Password { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class TenantMemberDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

using MultiTenantInventory.Api.DTOs;

namespace MultiTenantInventory.Api.Services;

public interface ITenantProvisioningService
{
    Task<List<PlatformTenantDto>> GetAllTenantsAsync(CancellationToken cancellationToken = default);
    Task<PlatformTenantDto?> GetTenantByIdAsync(string tenantId, CancellationToken cancellationToken = default);
    Task<TenantProvisioningResponseDto> ProvisionTenantAsync(CreateTenantRequestDto request, string initiatedByUserId, CancellationToken cancellationToken = default);
    Task<PlatformTenantDto?> UpdateTenantStatusAsync(string tenantId, string newStatus, string initiatedByUserId, CancellationToken cancellationToken = default);
    Task<List<TenantMemberDto>> GetTenantMembersAsync(string tenantId, CancellationToken cancellationToken = default);
    Task<InvitationDetailsDto?> GetInvitationByTokenAsync(string rawToken, CancellationToken cancellationToken = default);
    Task<UserDto> AcceptInvitationAsync(string rawToken, AcceptInvitationDto request, CancellationToken cancellationToken = default);
}

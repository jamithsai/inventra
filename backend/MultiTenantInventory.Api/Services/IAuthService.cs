using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Services;

public interface IAuthService
{
    string GenerateJwtToken(User user, IEnumerable<string> authorizedTenantIds);
    Task<LoginResponseDto?> LoginAsync(LoginDto loginDto, CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(string userId, CancellationToken cancellationToken = default);
    Task<List<DemoAccountDto>> GetDemoAccountsAsync(CancellationToken cancellationToken = default);
}

using MultiTenantInventory.Api.DTOs;

namespace MultiTenantInventory.Api.Services;

public interface IAnalyticsService
{
    Task<DashboardAnalyticsDto> GetDashboardAnalyticsAsync(int timeRangeDays = 30, CancellationToken cancellationToken = default);
}

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MultiTenantInventory.Api.DTOs;
using Xunit;

namespace MultiTenantInventory.Tests;

public class AnalyticsIsolationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public AnalyticsIsolationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password, string tenantId)
    {
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = email,
            Password = password
        });

        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var authData = await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        authData.Should().NotBeNull();

        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
        client.DefaultRequestHeaders.Add("X-Tenant-ID", tenantId);
        client.DefaultRequestHeaders.Add("X-User-ID", authData.User.Id);

        return client;
    }

    [Fact]
    public async Task Analytics_AcmeRetail_ReturnsOnlyAcmeData()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/analytics/dashboard?timeRangeDays=30");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var analytics = await response.Content.ReadFromJsonAsync<DashboardAnalyticsDto>(_jsonOptions);
        analytics.Should().NotBeNull();
        analytics!.TenantId.Should().Be("acme-retail");
        analytics.Summary.TotalProducts.Should().BeGreaterThan(0);
        analytics.Summary.TotalInventoryValue.Should().BeGreaterThan(0);

        // Top items must only belong to Acme (e.g., iPhone 15, MacBook, Apple Watch)
        analytics.TopItems.Should().NotBeEmpty();
        analytics.TopItems.Should().OnlyContain(i => !i.Name.Contains("Raspberry Pi") && !i.Name.Contains("Standing Desk"));
        analytics.TopItems.Should().Contain(i => i.Name.Contains("iPhone 15"));

        // Categories must match Acme categories
        analytics.CategoryValue.Should().NotBeEmpty();
        analytics.CategoryValue.Should().Contain(c => c.Category == "Smartphones");

        // Stock movement timeline must have exactly 30 days
        analytics.StockMovement.Should().HaveCount(30);
    }

    [Fact]
    public async Task Analytics_NovaElectronics_ReturnsOnlyNovaData()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("manager@nova-electronics.io", "Inventra@2026!", "nova-electronics");

        // Act
        var response = await client.GetAsync("/api/analytics/dashboard?timeRangeDays=30");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var analytics = await response.Content.ReadFromJsonAsync<DashboardAnalyticsDto>(_jsonOptions);
        analytics.Should().NotBeNull();
        analytics!.TenantId.Should().Be("nova-electronics");

        // Nova items (e.g. Raspberry Pi, Arduino) must be present, but NOT Acme items
        analytics.TopItems.Should().NotBeEmpty();
        analytics.TopItems.Should().OnlyContain(i => !i.Name.Contains("iPhone 15") && !i.Name.Contains("Herman Miller"));
        analytics.TopItems.Should().Contain(i => i.Name.Contains("Raspberry Pi"));

        // Categories must match Nova categories
        analytics.CategoryValue.Should().Contain(c => c.Category == "Single-Board Computers");
    }

    [Fact]
    public async Task Analytics_UnauthorizedTenantSelection_Returns403Forbidden()
    {
        // Arrange: Nova Manager attempts to request Zenith Supplies analytics
        var client = await CreateAuthenticatedClientAsync("manager@nova-electronics.io", "Inventra@2026!", "zenith-supplies");

        // Act
        var response = await client.GetAsync("/api/analytics/dashboard?timeRangeDays=30");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Analytics_MissingTenantHeader_Returns400BadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = "admin@platform.io",
            Password = "Inventra@2026!"
        });
        var authData = await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);

        // Act without X-Tenant-ID
        var response = await client.GetAsync("/api/analytics/dashboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(7, 7)]
    [InlineData(30, 30)]
    [InlineData(90, 90)]
    public async Task Analytics_TimeRangeParameter_ControlsTimelinePoints(int requestDays, int expectedPoints)
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync($"/api/analytics/dashboard?timeRangeDays={requestDays}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var analytics = await response.Content.ReadFromJsonAsync<DashboardAnalyticsDto>(_jsonOptions);
        analytics.Should().NotBeNull();
        analytics!.TimeRangeDays.Should().Be(requestDays);
        analytics.StockMovement.Should().HaveCount(expectedPoints);
    }
}

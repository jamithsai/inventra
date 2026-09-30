using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using Xunit;

namespace MultiTenantInventory.Tests;

public class TenantIsolationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public TenantIsolationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    }

    private HttpClient CreateClientWithTenant(string tenantId, string userId = "usr_admin_1")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Tenant-ID", tenantId);
        client.DefaultRequestHeaders.Add("X-User-ID", userId);
        return client;
    }

    [Fact]
    public async Task Requirement1_TenantA_CanAccessTenantA_Inventory()
    {
        // Arrange: Acme Retail client
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");

        // Act
        var response = await client.GetAsync("/api/inventory");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<InventoryItem>>(_jsonOptions);
        items.Should().NotBeNull();
        items!.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.TenantId == "acme-retail");
        items.Should().Contain(i => i.Name.Contains("iPhone 15"));
    }

    [Fact]
    public async Task Requirement2_TenantA_CannotAccessTenantB_InventoryList()
    {
        // Arrange: Acme Retail client
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");

        // Act
        var response = await client.GetAsync("/api/inventory");

        // Assert: Nova Electronics and Zenith Supplies items must NEVER appear
        var items = await response.Content.ReadFromJsonAsync<List<InventoryItem>>(_jsonOptions);
        items.Should().NotBeNull();
        items.Should().NotContain(i => i.TenantId == "nova-electronics");
        items.Should().NotContain(i => i.TenantId == "zenith-supplies");
        items.Should().NotContain(i => i.Name.Contains("ESP32"));
        items.Should().NotContain(i => i.Name.Contains("Herman Miller"));
    }

    [Fact]
    public async Task Requirement3_TenantA_CannotAccessTenantB_ItemById_IDORBlocked()
    {
        // Arrange: Acme Retail client trying to read item_nova_1 (ESP32) belonging to Nova Electronics
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");

        // Act: Target item_nova_1
        var response = await client.GetAsync("/api/inventory/item_nova_1");

        // Assert: EF Core Query filter ensures the item is not found within Acme's scope
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Requirement4_TenantA_CannotUpdateTenantB_Item()
    {
        // Arrange: Acme Retail client trying to overwrite Zenith item_zenith_1 (Herman Miller Chair)
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");
        var updateDto = new UpdateInventoryItemDto
        {
            Name = "HACKED BY RIVAL TENANT",
            Price = 1.00m
        };

        // Act
        var response = await client.PutAsJsonAsync("/api/inventory/item_zenith_1", updateDto);

        // Assert: Update rejected
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Requirement5_TenantA_CannotDeleteTenantB_Item()
    {
        // Arrange: Acme Retail client attempting to delete Nova item_nova_1
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");

        // Act
        var response = await client.DeleteAsync("/api/inventory/item_nova_1");

        // Assert: Deletion rejected
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Requirement6_Unauthorized_XTenantId_Header_IsRejectedByMiddleware()
    {
        // Arrange: Admin user (authorized only for acme and nova) attempting to send X-Tenant-ID: zenith-supplies
        var client = CreateClientWithTenant("zenith-supplies", "usr_admin_1");

        // Act
        var response = await client.GetAsync("/api/inventory");

        // Assert: TenantResolutionMiddleware intercepts and rejects with 403 Forbidden
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("TenantAccessDenied");
    }

    [Fact]
    public async Task Requirement7_Missing_XTenantId_Header_ReturnsBadRequest()
    {
        // Arrange: Client with no X-Tenant-ID header
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-ID", "usr_admin_1");

        // Act
        var response = await client.GetAsync("/api/inventory");

        // Assert: Middleware requires header
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("TenantHeaderMissing");
    }

    [Fact]
    public async Task Requirement8_TenantA_CannotAccessTenantB_S3Files()
    {
        // Arrange: Acme Retail client trying to download Nova's file_nova_1
        var client = CreateClientWithTenant("acme-retail", "usr_admin_1");

        // Act
        var response = await client.GetAsync("/api/files/file_nova_1");

        // Assert: File isolation blocks retrieval
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Requirement9_TenantSpecific_AuditLogs_AreIsolated()
    {
        // Arrange: Nova Electronics client
        var client = CreateClientWithTenant("nova-electronics", "usr_manager_nova");

        // Act
        var response = await client.GetAsync("/api/audit-logs");

        // Assert: Only Nova audit logs are returned
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var logs = await response.Content.ReadFromJsonAsync<List<AuditLog>>(_jsonOptions);
        logs.Should().NotBeNull();
        logs.Should().OnlyContain(l => l.TenantId == "nova-electronics");
        logs.Should().NotContain(l => l.TenantId == "acme-retail");
        logs.Should().NotContain(l => l.TenantId == "zenith-supplies");
    }
}

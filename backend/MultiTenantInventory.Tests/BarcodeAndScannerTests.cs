using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using Xunit;

namespace MultiTenantInventory.Tests;

public class BarcodeAndScannerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public BarcodeAndScannerTests(WebApplicationFactory<Program> factory)
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
    public async Task Barcode_Lookup_InAuthorizedTenant_ReturnsProduct()
    {
        // Arrange: Acme Retail has iPhone 15 with barcode '0194253789012'
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/inventory/barcode/0194253789012");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var item = await response.Content.ReadFromJsonAsync<InventoryItem>(_jsonOptions);
        item.Should().NotBeNull();
        item!.TenantId.Should().Be("acme-retail");
        item.Barcode.Should().Be("0194253789012");
        item.SKU.Should().Be("ACM-IPH-15P");
    }

    [Fact]
    public async Task Barcode_CrossTenantLookup_IsBlocked_Returns404NotFound()
    {
        // Arrange: Nova Electronics has ESP32 with barcode '5901234123457'
        // Attempt lookup while authenticated inside Acme Retail
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/inventory/barcode/5901234123457");

        // Assert: EF Core query filter isolates search strictly to Acme Retail, returning 404
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Barcode_Lookup_InCorrectTenant_AfterSwitch_ReturnsProduct()
    {
        // Arrange: Nova Electronics Manager in nova-electronics
        var client = await CreateAuthenticatedClientAsync("manager@nova-electronics.io", "Inventra@2026!", "nova-electronics");

        // Act
        var response = await client.GetAsync("/api/inventory/barcode/5901234123457");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var item = await response.Content.ReadFromJsonAsync<InventoryItem>(_jsonOptions);
        item.Should().NotBeNull();
        item!.TenantId.Should().Be("nova-electronics");
        item.Barcode.Should().Be("5901234123457");
        item.SKU.Should().Be("NOV-ESP-32D");
    }

    [Fact]
    public async Task Barcode_UnknownBarcode_Returns404NotFound()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/inventory/barcode/9999999999999");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Barcode_SearchInInventoryFilter_FindsProduct()
    {
        // Arrange: Search Acme inventory by barcode string
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/inventory?search=0884116412345");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<InventoryItem>>(_jsonOptions);
        items.Should().NotBeNull();
        items!.Should().ContainSingle(i => i.SKU == "ACM-XPS-15");
    }

    [Fact]
    public async Task Barcode_DuplicateInSameTenant_IsRejected()
    {
        // Arrange: Try to create an item in Acme with the existing iPhone barcode '0194253789012'
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var duplicateDto = new CreateInventoryItemDto
        {
            Name = "Duplicate Barcode Test Item",
            SKU = $"TEST-DUP-{Guid.NewGuid().ToString()[..6].ToUpper()}",
            Category = "Testing",
            Quantity = 10,
            Price = 49.99m,
            Barcode = "0194253789012" // Already used by iPhone
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/inventory", duplicateDto);

        // Assert: Should be rejected
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Barcode_CanCreateAndLookup_NewProductWithBarcode()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");
        var uniqueBarcode = "890" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString()[..10];
        var uniqueSku = $"ACM-BAR-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var createDto = new CreateInventoryItemDto
        {
            Name = "Warehouse Wireless Barcode Terminal",
            SKU = uniqueSku,
            Category = "Warehouse Tech",
            Quantity = 15,
            Price = 499.00m,
            LowStockThreshold = 3,
            Barcode = uniqueBarcode
        };

        // Act 1: Create
        var createRes = await client.PostAsJsonAsync("/api/inventory", createDto);
        createRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Act 2: Lookup by Barcode
        var lookupRes = await client.GetAsync($"/api/inventory/barcode/{uniqueBarcode}");
        lookupRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var item = await lookupRes.Content.ReadFromJsonAsync<InventoryItem>(_jsonOptions);
        item.Should().NotBeNull();
        item!.Name.Should().Be("Warehouse Wireless Barcode Terminal");
        item.Barcode.Should().Be(uniqueBarcode);
    }
}

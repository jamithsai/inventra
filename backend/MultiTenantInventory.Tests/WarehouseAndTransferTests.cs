using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using Xunit;

namespace MultiTenantInventory.Tests;

public class WarehouseAndTransferTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public WarehouseAndTransferTests(WebApplicationFactory<Program> factory)
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
    public async Task Warehouses_GetAll_ReturnsOnlyTenantScopedWarehouses()
    {
        // Arrange
        var acmeClient = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");
        var novaClient = await CreateAuthenticatedClientAsync("manager@nova-electronics.io", "Inventra@2026!", "nova-electronics");

        // Act
        var acmeResponse = await acmeClient.GetAsync("/api/warehouses");
        var novaResponse = await novaClient.GetAsync("/api/warehouses");

        // Assert
        acmeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var acmeWarehouses = await acmeResponse.Content.ReadFromJsonAsync<List<WarehouseDto>>(_jsonOptions);
        acmeWarehouses.Should().NotBeNull();
        acmeWarehouses!.Should().OnlyContain(w => w.TenantId == "acme-retail");
        acmeWarehouses.Should().Contain(w => w.Code == "WH-HYD-01");

        novaResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var novaWarehouses = await novaResponse.Content.ReadFromJsonAsync<List<WarehouseDto>>(_jsonOptions);
        novaWarehouses.Should().NotBeNull();
        novaWarehouses!.Should().OnlyContain(w => w.TenantId == "nova-electronics");
        novaWarehouses.Should().Contain(w => w.Code == "WH-HYD-02");
    }

    [Fact]
    public async Task Warehouses_CrossTenantLookup_ReturnsNotFound()
    {
        // Arrange: Nova tries to access Acme warehouse
        var novaClient = await CreateAuthenticatedClientAsync("manager@nova-electronics.io", "Inventra@2026!", "nova-electronics");

        // Act
        var response = await novaClient.GetAsync("/api/warehouses/wh_acme_1");

        // Assert: EF Core Global Query Filter ensures foreign warehouse returns 404
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Warehouses_StockTransfer_SuccessfullyTransfersBetweenActiveWarehouses()
    {
        // Arrange: Acme transfers 5 units of iPhone 15 Pro Max from WH-HYD-01 to WH-BLR-01
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var transferPayload = new StockTransferRequestDto
        {
            SourceWarehouseId = "wh_acme_1",
            DestinationWarehouseId = "wh_acme_2",
            ProductId = "item_acme_1",
            Quantity = 5,
            Note = "Regional restock for weekend rush"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/warehouses/transfer", transferPayload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<StockTransferResultDto>(_jsonOptions);
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Message.Should().Contain("Successfully transferred");

        // Verify product aggregate quantity is preserved (42 units total)
        var productResponse = await client.GetAsync("/api/inventory/item_acme_1");
        productResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var product = await productResponse.Content.ReadFromJsonAsync<InventoryItem>(_jsonOptions);
        product.Should().NotBeNull();
        product!.Quantity.Should().Be(42);

        // Verify per-warehouse breakdown reflects transfer
        var stockBreakdownResponse = await client.GetAsync("/api/warehouses/product/item_acme_1");
        stockBreakdownResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var breakdown = await stockBreakdownResponse.Content.ReadFromJsonAsync<List<ProductWarehouseStockDto>>(_jsonOptions);
        breakdown.Should().NotBeNull();
        var blrStock = breakdown!.FirstOrDefault(b => b.WarehouseId == "wh_acme_2");
        blrStock.Should().NotBeNull();
        blrStock!.Quantity.Should().BeGreaterOrEqualTo(5);
    }

    [Fact]
    public async Task Warehouses_StockTransfer_InsufficientStock_ReturnsBadRequest()
    {
        // Arrange: Request 99999 units (more than available)
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var transferPayload = new StockTransferRequestDto
        {
            SourceWarehouseId = "wh_acme_1",
            DestinationWarehouseId = "wh_acme_2",
            ProductId = "item_acme_1",
            Quantity = 99999,
            Note = "Impossible transfer"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/warehouses/transfer", transferPayload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Warehouses_StockTransfer_CrossTenant_IsBlocked()
    {
        // Arrange: Acme tries to transfer stock into a Nova warehouse
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var transferPayload = new StockTransferRequestDto
        {
            SourceWarehouseId = "wh_acme_1",
            DestinationWarehouseId = "wh_nova_1", // Foreign warehouse
            ProductId = "item_acme_1",
            Quantity = 1,
            Note = "Illegal cross-tenant transfer attempt"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/warehouses/transfer", transferPayload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Warehouses_Deactivation_FailsWhenStockExists()
    {
        // Arrange: WH-HYD-01 contains inventory items
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var updatePayload = new UpdateWarehouseDto
        {
            IsActive = false
        };

        // Act
        var response = await client.PutAsJsonAsync("/api/warehouses/wh_acme_1", updatePayload);

        // Assert: Invariant 2 — Cannot deactivate warehouse with positive stock
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Warehouses_BarcodeLookup_IncludesMultiWarehouseBreakdown()
    {
        // Arrange: Acme item with barcode 0194253789012 (iPhone 15 Pro Max)
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        // Act
        var response = await client.GetAsync("/api/inventory/barcode/0194253789012");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var item = await response.Content.ReadFromJsonAsync<InventoryItem>(_jsonOptions);
        item.Should().NotBeNull();
        item!.WarehouseStocks.Should().NotBeNull();
        item.WarehouseStocks.Should().NotBeEmpty();
        item.WarehouseStocks.Should().Contain(w => w.WarehouseCode == "WH-HYD-01");
    }

    [Fact]
    public async Task Warehouses_CreateWarehouse_DuplicateCodeWithinTenant_ReturnsConflict()
    {
        // Arrange: WH-HYD-01 already exists in acme-retail
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var duplicatePayload = new CreateWarehouseDto
        {
            Name = "Duplicate Hyderabad Depot",
            Code = "WH-HYD-01",
            City = "Hyderabad"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/warehouses", duplicatePayload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Warehouses_TransferStock_ZeroOrNegativeQuantity_ReturnsBadRequest()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var zeroPayload = new StockTransferRequestDto
        {
            SourceWarehouseId = "wh_acme_1",
            DestinationWarehouseId = "wh_acme_2",
            ProductId = "item_acme_1",
            Quantity = 0
        };

        var negativePayload = new StockTransferRequestDto
        {
            SourceWarehouseId = "wh_acme_1",
            DestinationWarehouseId = "wh_acme_2",
            ProductId = "item_acme_1",
            Quantity = -5
        };

        // Act
        var zeroResponse = await client.PostAsJsonAsync("/api/warehouses/transfer", zeroPayload);
        var negativeResponse = await client.PostAsJsonAsync("/api/warehouses/transfer", negativePayload);

        // Assert
        zeroResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        negativeResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Warehouses_CreateProduct_WithExplicitInactiveWarehouse_Fails()
    {
        // Arrange: Create an empty warehouse and deactivate it
        var client = await CreateAuthenticatedClientAsync("admin@platform.io", "Inventra@2026!", "acme-retail");

        var newWarehouse = new CreateWarehouseDto
        {
            Name = "Temporary Deactivated Hub",
            Code = $"WH-TMP-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            City = "Nagpur"
        };

        var whRes = await client.PostAsJsonAsync("/api/warehouses", newWarehouse);
        whRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdWh = await whRes.Content.ReadFromJsonAsync<WarehouseDto>(_jsonOptions);
        createdWh.Should().NotBeNull();

        // Deactivate it
        var deactRes = await client.PutAsJsonAsync($"/api/warehouses/{createdWh!.Id}", new UpdateWarehouseDto { IsActive = false });
        deactRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act: Try to create a product directing initial stock to the inactive warehouse
        var productPayload = new CreateInventoryItemDto
        {
            Name = "Test Inactive Target Item",
            SKU = $"TEST-INACT-{Guid.NewGuid().ToString()[..4].ToUpper()}",
            Category = "General",
            Quantity = 10,
            Price = 100m,
            LowStockThreshold = 2,
            WarehouseId = createdWh.Id
        };

        var productRes = await client.PostAsJsonAsync("/api/inventory", productPayload);

        // Assert: Should be rejected
        productRes.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.InternalServerError);
    }
}

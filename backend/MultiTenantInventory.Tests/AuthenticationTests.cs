using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Models;
using Xunit;

namespace MultiTenantInventory.Tests;

public class AuthenticationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public AuthenticationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    }

    [Fact]
    public async Task Auth1_Login_WithValidAdminCredentials_ReturnsJwtToken_And_Tenants()
    {
        var client = _factory.CreateClient();

        var loginDto = new LoginDto
        {
            Email = "admin@platform.io",
            Password = "Inventra@2026!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", loginDto);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        result.Should().NotBeNull();
        result!.Token.Should().NotBeNullOrWhiteSpace();
        result.User.Email.Should().Be("admin@platform.io");
        result.User.Role.Should().Be("ADMIN");
        result.AuthorizedTenants.Should().NotBeEmpty();
        result.AuthorizedTenants.Select(t => t.Id).Should().Contain("acme-retail");
        result.AuthorizedTenants.Select(t => t.Id).Should().Contain("nova-electronics");

        // Verify token is valid JWT structure
        var handler = new JwtSecurityTokenHandler();
        handler.CanReadToken(result.Token).Should().BeTrue();
        var jwt = handler.ReadJwtToken(result.Token);
        jwt.Issuer.Should().Be("InventraPlatform");
    }

    [Fact]
    public async Task Auth2_Login_WithInvalidPassword_Returns_401Unauthorized()
    {
        var client = _factory.CreateClient();

        var loginDto = new LoginDto
        {
            Email = "admin@platform.io",
            Password = "WrongPassword123!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", loginDto);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("InvalidCredentials");
    }

    [Fact]
    public async Task Auth3_Login_WithNonExistentEmail_Returns_401Unauthorized()
    {
        var client = _factory.CreateClient();

        var loginDto = new LoginDto
        {
            Email = "ghost@doesnotexist.com",
            Password = "Inventra@2026!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", loginDto);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("InvalidCredentials");
    }

    [Fact]
    public async Task Auth4_GetDemoAccounts_ReturnsPublicMetadata_WithoutSensitiveSecrets()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/demo-accounts");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var accounts = await response.Content.ReadFromJsonAsync<List<DemoAccountDto>>(_jsonOptions);
        accounts.Should().NotBeNull();
        accounts!.Should().HaveCountGreaterOrEqualTo(4);
        accounts.Select(a => a.Email).Should().Contain("admin@platform.io");
        accounts.Select(a => a.Email).Should().Contain("manager@nova-electronics.io");
        accounts.Select(a => a.Email).Should().Contain("specialist@zenith-supplies.io");
        accounts.Select(a => a.Email).Should().Contain("auditor@acme-retail.com");

        var json = await response.Content.ReadAsStringAsync();
        json.Should().NotContain("PasswordHash");
        json.Should().NotContain("Inventra@2026!");
    }

    [Fact]
    public async Task Auth5_ProtectedEndpoint_With_RealJwtBearerToken_Succeeds()
    {
        var client = _factory.CreateClient();

        // 1. Authenticate to obtain real signed JWT token
        var loginDto = new LoginDto
        {
            Email = "manager@nova-electronics.io",
            Password = "Inventra@2026!"
        };
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", loginDto);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginData = await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        loginData.Should().NotBeNull();

        // 2. Call protected tenant endpoint using Authorization: Bearer <token>
        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginData!.Token);
        authClient.DefaultRequestHeaders.Add("X-Tenant-ID", "nova-electronics");

        var response = await authClient.GetAsync("/api/inventory");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<InventoryItem>>(_jsonOptions);
        items.Should().NotBeNull();
        items!.Should().NotBeEmpty();
        items.Should().OnlyContain(i => i.TenantId == "nova-electronics");
    }

    [Fact]
    public async Task Auth6_UserWithJwt_Attempting_Unauthorized_Tenant_Returns_403Forbidden()
    {
        var client = _factory.CreateClient();

        // 1. Authenticate as Nova Manager (authorized ONLY for nova-electronics)
        var loginDto = new LoginDto
        {
            Email = "manager@nova-electronics.io",
            Password = "Inventra@2026!"
        };
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", loginDto);
        var loginData = await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);

        // 2. Attempt to access acme-retail with Nova Manager's valid JWT
        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginData!.Token);
        authClient.DefaultRequestHeaders.Add("X-Tenant-ID", "acme-retail");

        var response = await authClient.GetAsync("/api/inventory");

        // Assert: 403 Forbidden because Nova Manager is not a member of Acme Retail
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("TenantAccessDenied");
    }
}

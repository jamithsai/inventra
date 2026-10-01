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

public class TenantOnboardingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions;

    public TenantOnboardingTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    }

    private async Task<string> GetAdminJwtTokenAsync()
    {
        var client = _factory.CreateClient();
        var loginDto = new LoginDto { Email = "admin@platform.io", Password = "Inventra@2026!" };
        var res = await client.PostAsJsonAsync("/api/auth/login", loginDto);
        var data = await res.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        return data!.Token;
    }

    private async Task<string> GetManagerJwtTokenAsync()
    {
        var client = _factory.CreateClient();
        var loginDto = new LoginDto { Email = "manager@nova-electronics.io", Password = "Inventra@2026!" };
        var res = await client.PostAsJsonAsync("/api/auth/login", loginDto);
        var data = await res.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        return data!.Token;
    }

    [Fact]
    public async Task Requirement1_PlatformAdmin_CanCreateTenant_And_RetrieveInvitation()
    {
        var token = await GetAdminJwtTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var slug = $"orbit-health-{Guid.NewGuid():N}"[..16];
        var code = $"ORB{Guid.NewGuid():N}"[..6].ToUpperInvariant();
        var adminEmail = $"{slug}@orbithealthcare.com";

        var request = new CreateTenantRequestDto
        {
            Name = "Orbit Healthcare Pvt. Ltd.",
            Slug = slug,
            Code = code,
            AdminName = "Rahul Sharma",
            AdminEmail = adminEmail,
            Industry = "Healthcare & Pharmaceuticals",
            ContactNumber = "+1-555-0199",
            Description = "Multi-specialty hospital supply chain and medical equipment distributor."
        };

        var response = await client.PostAsJsonAsync("/api/platform/tenants", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await response.Content.ReadFromJsonAsync<TenantProvisioningResponseDto>(_jsonOptions);
        result.Should().NotBeNull();
        result!.Tenant.Id.Should().Be(slug);
        result.Tenant.Name.Should().Be("Orbit Healthcare Pvt. Ltd.");
        result.Tenant.Code.Should().Be(code);
        result.Tenant.Status.Should().Be("ACTIVE");
        result.Invitation.RawToken.Should().NotBeNullOrWhiteSpace();
        result.Invitation.Email.Should().Be(adminEmail);
    }

    [Fact]
    public async Task Requirement2_TenantAdmin_CannotCreateTenant_Returns_403Forbidden()
    {
        var token = await GetManagerJwtTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new CreateTenantRequestDto
        {
            Name = "Rogue Tenant",
            Code = "ROGUE",
            AdminName = "Hacker",
            AdminEmail = "hacker@rogue.com"
        };

        var response = await client.PostAsJsonAsync("/api/platform/tenants", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("PlatformAdminRequired");
    }

    [Fact]
    public async Task Requirement3_DuplicateTenantSlug_IsRejected_Returns_409Conflict()
    {
        var token = await GetAdminJwtTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Attempt to create a tenant with slug "acme-retail" which already exists
        var request = new CreateTenantRequestDto
        {
            Name = "Acme Clone",
            Slug = "acme-retail",
            Code = "ACME-NEW",
            AdminName = "Duplicate Admin",
            AdminEmail = "dup@acme.com"
        };

        var response = await client.PostAsJsonAsync("/api/platform/tenants", request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("TenantConflict");
    }

    [Fact]
    public async Task Requirement4_InvitationFlow_CompleteLifecycle_Activation_And_IsolatedLogin()
    {
        var adminToken = await GetAdminJwtTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var slug = $"pulse-care-{Guid.NewGuid():N}"[..16];
        var code = $"PLS{Guid.NewGuid():N}"[..6].ToUpperInvariant();
        var adminEmail = $"{slug}-admin@pulsecare.io";

        // 1. Provision new tenant
        var createRequest = new CreateTenantRequestDto
        {
            Name = "PulseCare Diagnostics",
            Slug = slug,
            Code = code,
            AdminName = "Dr. Vikram Seth",
            AdminEmail = adminEmail,
            Industry = "Diagnostics"
        };

        var provRes = await client.PostAsJsonAsync("/api/platform/tenants", createRequest);
        provRes.StatusCode.Should().Be(HttpStatusCode.Created);
        var provData = await provRes.Content.ReadFromJsonAsync<TenantProvisioningResponseDto>(_jsonOptions);
        var rawToken = provData!.Invitation.RawToken;

        // 2. Query invitation details from public endpoint
        var pubClient = _factory.CreateClient();
        var inviteRes = await pubClient.GetAsync($"/api/invitations/{rawToken}");
        inviteRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var inviteDetails = await inviteRes.Content.ReadFromJsonAsync<InvitationDetailsDto>(_jsonOptions);
        inviteDetails!.TenantId.Should().Be(slug);
        inviteDetails.Email.Should().Be(adminEmail);
        inviteDetails.Status.Should().Be("PENDING");

        // 3. Accept invitation and establish password
        var acceptDto = new AcceptInvitationDto
        {
            Password = "PulseCare@2026!",
            ConfirmPassword = "PulseCare@2026!"
        };

        var acceptRes = await pubClient.PostAsJsonAsync($"/api/invitations/{rawToken}/accept", acceptDto);
        acceptRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 4. Verify invitation cannot be reused
        var reuseRes = await pubClient.PostAsJsonAsync($"/api/invitations/{rawToken}/accept", acceptDto);
        reuseRes.StatusCode.Should().Be(HttpStatusCode.Conflict);

        // 5. Authenticate as newly provisioned Tenant Admin
        var newLoginDto = new LoginDto
        {
            Email = adminEmail,
            Password = "PulseCare@2026!"
        };
        var loginRes = await pubClient.PostAsJsonAsync("/api/auth/login", newLoginDto);
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginData = await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions);
        loginData.Should().NotBeNull();
        loginData!.AuthorizedTenants.Should().HaveCount(1);
        loginData.AuthorizedTenants[0].Id.Should().Be(slug);

        // 6. Call authorized tenant inventory (Empty initial catalog)
        var newTenantClient = _factory.CreateClient();
        newTenantClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginData.Token);
        newTenantClient.DefaultRequestHeaders.Add("X-Tenant-ID", slug);

        var invRes = await newTenantClient.GetAsync("/api/inventory");
        invRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var items = await invRes.Content.ReadFromJsonAsync<List<InventoryItem>>(_jsonOptions);
        items.Should().BeEmpty();

        // 7. Create an item in the new tenant
        var createItemDto = new CreateInventoryItemDto
        {
            Name = "Ultrasound Scanner Probe 4D",
            SKU = "PLS-US-4D",
            Category = "Imaging Equipment",
            Quantity = 8,
            Price = 12500.00m,
            LowStockThreshold = 2
        };
        var itemRes = await newTenantClient.PostAsJsonAsync("/api/inventory", createItemDto);
        itemRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // 8. Verify the new Tenant Admin CANNOT access Acme Retail (Cross-tenant security block)
        var crossTenantClient = _factory.CreateClient();
        crossTenantClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginData.Token);
        crossTenantClient.DefaultRequestHeaders.Add("X-Tenant-ID", "acme-retail");

        var crossRes = await crossTenantClient.GetAsync("/api/inventory");
        crossRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var crossContent = await crossRes.Content.ReadAsStringAsync();
        crossContent.Should().Contain("TenantAccessDenied");
    }

    [Fact]
    public async Task Requirement5_SuspendedTenant_BlocksAllResourceAccess_UntilReactivated()
    {
        var adminToken = await GetAdminJwtTokenAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var slug = $"suspend-test-{Guid.NewGuid():N}"[..16];
        var code = $"SUS{Guid.NewGuid():N}"[..6].ToUpperInvariant();

        // 1. Create a tenant
        var createRequest = new CreateTenantRequestDto
        {
            Name = "Suspension Testing Lab",
            Slug = slug,
            Code = code,
            AdminName = "Lab Admin",
            AdminEmail = $"{slug}@lab.io"
        };
        var provRes = await client.PostAsJsonAsync("/api/platform/tenants", createRequest);
        provRes.StatusCode.Should().Be(HttpStatusCode.Created);

        // Accept invitation to activate user
        var provData = await provRes.Content.ReadFromJsonAsync<TenantProvisioningResponseDto>(_jsonOptions);
        var pubClient = _factory.CreateClient();
        await pubClient.PostAsJsonAsync($"/api/invitations/{provData!.Invitation.RawToken}/accept", new AcceptInvitationDto
        {
            Password = "Inventra@2026!",
            ConfirmPassword = "Inventra@2026!"
        });

        // Get tenant user token
        var loginRes = await pubClient.PostAsJsonAsync("/api/auth/login", new LoginDto
        {
            Email = $"{slug}@lab.io",
            Password = "Inventra@2026!"
        });
        var tenantUserToken = (await loginRes.Content.ReadFromJsonAsync<LoginResponseDto>(_jsonOptions))!.Token;

        // 2. Suspend the tenant via Platform Admin
        var patchRes = await client.PatchAsJsonAsync($"/api/platform/tenants/{slug}/status", new UpdateTenantStatusDto { Status = "SUSPENDED" });
        patchRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 3. User attempts to access inventory in suspended tenant -> Expect 403 Forbidden (TenantSuspended)
        var userClient = _factory.CreateClient();
        userClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tenantUserToken);
        userClient.DefaultRequestHeaders.Add("X-Tenant-ID", slug);

        var blockedRes = await userClient.GetAsync("/api/inventory");
        blockedRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var blockedContent = await blockedRes.Content.ReadAsStringAsync();
        blockedContent.Should().Contain("TenantSuspended");

        // 4. Reactivate tenant via Platform Admin
        var reactivateRes = await client.PatchAsJsonAsync($"/api/platform/tenants/{slug}/status", new UpdateTenantStatusDto { Status = "ACTIVE" });
        reactivateRes.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. User accesses inventory in reactivated tenant -> Expect 200 OK
        var restoredRes = await userClient.GetAsync("/api/inventory");
        restoredRes.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

using System.Net;
using System.Text.Json;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;
    private readonly IConfiguration _configuration;

    public TenantResolutionMiddleware(
        RequestDelegate next, 
        ILogger<TenantResolutionMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(
        HttpContext context, 
        ITenantContext tenantContext, 
        ITenantResolver tenantResolver,
        AppDbContext dbContext)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

        // 1. Bypass non-tenant scoped endpoints (Auth, Swagger, Health, Public Tenant list)
        if (IsPublicOrGlobalEndpoint(path, context.Request.Method))
        {
            await _next(context);
            return;
        }

        // 2. Read X-Tenant-ID Header
        if (!context.Request.Headers.TryGetValue("X-Tenant-ID", out var tenantHeaderValues) || 
            string.IsNullOrWhiteSpace(tenantHeaderValues.FirstOrDefault()))
        {
            _logger.LogWarning("Missing X-Tenant-ID header on tenant-scoped endpoint: {Path}", path);
            await WriteErrorResponseAsync(
                context, 
                HttpStatusCode.BadRequest, 
                "TenantHeaderMissing", 
                "The 'X-Tenant-ID' request header is required to access tenant-scoped resources.");
            return;
        }

        var requestedTenantId = tenantHeaderValues.FirstOrDefault()!.Trim().ToLowerInvariant();

        // 3. Validate that the Tenant exists in the database
        var tenant = await tenantResolver.GetTenantByIdAsync(requestedTenantId, context.RequestAborted);
        if (tenant == null)
        {
            _logger.LogWarning("Tenant '{TenantId}' does not exist.", requestedTenantId);
            await WriteErrorResponseAsync(
                context, 
                HttpStatusCode.NotFound, 
                "TenantNotFound", 
                $"Tenant with ID '{requestedTenantId}' was not found.");
            return;
        }

        // 4. Identify the Authenticated User (from JWT claims, X-User-ID header, or explicit demo fallback if enabled)
        var userId = GetAuthenticatedUserId(context);
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("Unauthenticated request to tenant endpoint: {Path}. Returning 401 Unauthorized.", path);
            await WriteErrorResponseAsync(
                context, 
                HttpStatusCode.Unauthorized, 
                "AuthenticationRequired", 
                "User authentication is required to access tenant data.");
            return;
        }

        // 5. Verify that the User is authorized for this Tenant (Check TenantMembership)
        var isAuthorized = await tenantResolver.IsUserAuthorizedForTenantAsync(userId, requestedTenantId, context.RequestAborted);
        if (!isAuthorized)
        {
            _logger.LogWarning("User '{UserId}' is NOT authorized for tenant '{TenantId}'. Access DENIED.", userId, requestedTenantId);
            
            // Record a security event in the audit log
            try
            {
                var securityLog = new AuditLog
                {
                    Id = Guid.NewGuid().ToString(),
                    TenantId = requestedTenantId,
                    UserId = userId,
                    UserName = $"User ({userId})",
                    Action = "SECURITY_ATTACK_BLOCKED",
                    EntityType = "SecurityViolation",
                    EntityId = path,
                    Details = $"Tenant Resolution Middleware blocked unauthorized access attempt for tenant '{requestedTenantId}' by user '{userId}'."
                };
                dbContext.AuditLogs.Add(securityLog);
                await dbContext.SaveChangesAsync(context.RequestAborted);
            }
            catch
            {
                // Suppress audit logging failures during security rejection
            }

            await WriteErrorResponseAsync(
                context, 
                HttpStatusCode.Forbidden, 
                "TenantAccessDenied", 
                $"User '{userId}' is not authorized to access tenant '{requestedTenantId}'. Tenant isolation prevented unauthorized access.");
            return;
        }

        // 6. Set the resolved Scoped ITenantContext
        var user = await dbContext.Users.FindAsync(new object[] { userId }, context.RequestAborted);
        var userName = user?.Name ?? userId;
        tenantContext.SetTenant(requestedTenantId, userId, userName);

        _logger.LogInformation("Tenant resolved: TenantId={TenantId}, User={UserId}", requestedTenantId, userId);

        // Continue request pipeline
        await _next(context);
    }

    private static bool IsPublicOrGlobalEndpoint(string path, string method)
    {
        if (path.StartsWith("/swagger") || 
            path.StartsWith("/api-docs") || 
            path.StartsWith("/health") || 
            path.StartsWith("/api/auth") ||
            path.StartsWith("/api/security/simulate-attack"))
        {
            return true;
        }

        // GET /api/tenants without subpath is a global metadata listing
        if (path.Equals("/api/tenants", StringComparison.OrdinalIgnoreCase) && method.Equals("GET", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    private string? GetAuthenticatedUserId(HttpContext context)
    {
        // 1. Check JWT Claims if authenticated by ASP.NET Core auth middleware
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var claim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ??
                        context.User.FindFirst("sub") ??
                        context.User.FindFirst("uid");
            if (claim != null && !string.IsNullOrWhiteSpace(claim.Value))
                return claim.Value;
        }

        // 2. Direct Bearer token parsing fallback
        if (context.Request.Headers.TryGetValue("Authorization", out var authHeaders) &&
            !string.IsNullOrWhiteSpace(authHeaders.FirstOrDefault()) &&
            authHeaders.FirstOrDefault()!.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var rawToken = authHeaders.FirstOrDefault()!["Bearer ".Length..].Trim();
            try
            {
                var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                if (handler.CanReadToken(rawToken))
                {
                    var jwt = handler.ReadJwtToken(rawToken);
                    var subClaim = jwt.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == "uid");
                    if (subClaim != null && !string.IsNullOrWhiteSpace(subClaim.Value))
                        return subClaim.Value;
                }
            }
            catch
            {
                // Invalid token format
            }
        }

        // 3. Check X-User-ID header (Supported for demo / development persona switching and backward compatibility)
        if (context.Request.Headers.TryGetValue("X-User-ID", out var userHeader) && !string.IsNullOrWhiteSpace(userHeader.FirstOrDefault()))
        {
            return userHeader.FirstOrDefault()!.Trim();
        }

        // 4. Demo Identity Fallback (ONLY if explicitly enabled via configuration and NEVER silently in production)
        var allowDemoFallback = _configuration.GetValue<bool>("Authentication:AllowDemoIdentityFallback", false);
        if (allowDemoFallback)
        {
            _logger.LogInformation("DEMO_AUTH_FALLBACK_USED: Defaulting to demo admin 'usr_admin_1' for endpoint {Path}", context.Request.Path);
            return "usr_admin_1";
        }

        // In production / when fallback is disabled, return null -> triggers HTTP 401 Unauthorized
        return null;
    }

    private static async Task WriteErrorResponseAsync(HttpContext context, HttpStatusCode statusCode, string errorCode, string message)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            error = errorCode,
            message,
            statusCode = (int)statusCode,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(json);
    }
}

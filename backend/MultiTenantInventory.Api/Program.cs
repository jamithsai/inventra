using System.Text;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Middleware;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Storage;
using MultiTenantInventory.Api.Tenant;

var builder = WebApplication.CreateBuilder(args);

// Dynamic Port configuration for Render/Docker environments
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://*:{port}");

// 1. Configure Services & Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 2. Configure JWT Bearer Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? AuthService.DefaultJwtSecret;
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? AuthService.DefaultIssuer;
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? AuthService.DefaultAudience;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization();

// 3. Swagger Configuration with JWT Bearer and X-Tenant-ID header support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Inventra Multi-Tenant Inventory Platform API",
        Version = "v1",
        Description = "Enterprise multi-tenant inventory platform featuring JWT Authentication, EF Core Global Query Filters, Tenant Middleware, and AWS S3 key isolation."
    });

    // Add Bearer JWT Token Support
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\""
    });

    // Add X-Tenant-ID header parameter definition
    c.AddSecurityDefinition("TenantHeader", new OpenApiSecurityScheme
    {
        Name = "X-Tenant-ID",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Tenant Identifier (e.g. acme-retail, nova-electronics, zenith-supplies)"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "TenantHeader" }
            },
            Array.Empty<string>()
        }
    });
});

// 4. Register Scoped Tenant Context, Resolver, Auth & Provisioning Services
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<ITenantResolver, TenantResolver>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITenantProvisioningService, TenantProvisioningService>();

// 5. Register Database with SQLite & Scoped AppDbContext
var dbPath = Path.Combine(AppContext.BaseDirectory, "multi_tenant_inventory.db");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite($"Data Source={dbPath}");
});

// 6. Register AWS S3 Client & File Storage
builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var accessKey = config["AWS:AccessKey"] ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
    var secretKey = config["AWS:SecretKey"] ?? Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY");
    var region = config["AWS:Region"] ?? Environment.GetEnvironmentVariable("AWS_REGION") ?? "us-east-1";

    if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey))
    {
        return new AmazonS3Client(accessKey, secretKey, Amazon.RegionEndpoint.GetBySystemName(region));
    }
    return null!;
});
builder.Services.AddScoped<IFileStorageService, S3FileStorageService>();

// 7. Register Business Services
builder.Services.AddScoped<IInventoryService, InventoryService>();

// 8. CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 9. Auto-migrate and seed demo tenant database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

// 10. Pipeline Configuration
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventra Multi-Tenant Inventory API v1");
    });
}

app.UseCors("AllowAll");

// 11. Authentication & Authorization Middleware
app.UseAuthentication();
app.UseAuthorization();

// 12. Register Tenant Resolution Middleware (Zero Trust on X-Tenant-ID)
app.UseMiddleware<TenantResolutionMiddleware>();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration test suite
public partial class Program { }

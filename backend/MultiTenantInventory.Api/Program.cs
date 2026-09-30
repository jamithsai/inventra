using Amazon.S3;
using Microsoft.EntityFrameworkCore;
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

// 2. Swagger Configuration with X-Tenant-ID and X-User-ID header support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Inventra Multi-Tenant Inventory Platform API",
        Version = "v1",
        Description = "Enterprise multi-tenant inventory platform featuring EF Core Global Query Filters, Tenant Middleware, and AWS S3 key isolation."
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
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "TenantHeader" }
            },
            Array.Empty<string>()
        }
    });
});

// 3. Register Scoped Tenant Context & Resolver
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<ITenantResolver, TenantResolver>();

// 4. Register Database with SQLite & Scoped AppDbContext
var dbPath = Path.Combine(AppContext.BaseDirectory, "multi_tenant_inventory.db");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite($"Data Source={dbPath}");
});

// 5. Register AWS S3 Client & File Storage
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

// 6. Register Business Services
builder.Services.AddScoped<IInventoryService, InventoryService>();

// 7. CORS Configuration
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

// 8. Auto-migrate and seed demo tenant database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

// 9. Pipeline Configuration
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Inventra Multi-Tenant Inventory API v1");
    });
}

app.UseCors("AllowAll");

// 10. Register Tenant Resolution Middleware (Zero Trust on X-Tenant-ID)
app.UseMiddleware<TenantResolutionMiddleware>();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration test suite
public partial class Program { }

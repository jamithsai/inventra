using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Models.Tenant> Tenants => Set<Models.Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<TenantMembership> TenantMemberships => Set<TenantMembership>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<TenantFile> TenantFiles => Set<TenantFile>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<TenantInvitation> TenantInvitations => Set<TenantInvitation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant Configuration
        modelBuilder.Entity<Models.Tenant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Industry).HasMaxLength(100);
            entity.Property(e => e.ContactNumber).HasMaxLength(50);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // TenantInvitation Configuration
        modelBuilder.Entity<TenantInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(100);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            entity.Property(e => e.AdminName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TokenHash).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.TenantId);

            entity.HasOne(e => e.Tenant)
                  .WithMany(t => t.Invitations)
                  .HasForeignKey(e => e.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // TenantMembership Configuration
        modelBuilder.Entity<TenantMembership>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Tenant)
                  .WithMany(t => t.Memberships)
                  .HasForeignKey(e => e.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Memberships)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.TenantId }).IsUnique();
        });

        // InventoryItem Configuration + EF Core Global Query Filter
        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SKU).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Price).HasPrecision(18, 2);
            entity.HasIndex(e => new { e.TenantId, e.SKU }).IsUnique();
            entity.HasIndex(e => e.TenantId);

            // GLOBAL QUERY FILTER: Automatically filters all queries to the active tenant
            entity.HasQueryFilter(e => _tenantContext.CurrentTenantId != null && e.TenantId == _tenantContext.CurrentTenantId);
        });

        // InventoryTransaction Configuration + EF Core Global Query Filter
        modelBuilder.Entity<InventoryTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.TenantId);

            // GLOBAL QUERY FILTER
            entity.HasQueryFilter(e => _tenantContext.CurrentTenantId != null && e.TenantId == _tenantContext.CurrentTenantId);
        });

        // TenantFile Configuration + EF Core Global Query Filter
        modelBuilder.Entity<TenantFile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.S3Key).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.TenantId);

            // GLOBAL QUERY FILTER
            entity.HasQueryFilter(e => _tenantContext.CurrentTenantId != null && e.TenantId == _tenantContext.CurrentTenantId);
        });

        // AuditLog Configuration + EF Core Global Query Filter
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TenantId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.TenantId);

            // GLOBAL QUERY FILTER
            entity.HasQueryFilter(e => _tenantContext.CurrentTenantId != null && e.TenantId == _tenantContext.CurrentTenantId);
        });
    }

    public override int SaveChanges()
    {
        EnforceTenantIsolationOnSave();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnforceTenantIsolationOnSave();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void EnforceTenantIsolationOnSave()
    {
        if (string.IsNullOrEmpty(_tenantContext.CurrentTenantId))
        {
            // Allowed during initial DB seeding or system migrations
            return;
        }

        var entries = ChangeTracker.Entries<ITenantEntity>();
        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added)
            {
                if (string.IsNullOrEmpty(entry.Entity.TenantId))
                {
                    entry.Entity.TenantId = _tenantContext.CurrentTenantId;
                }
                else if (entry.Entity.TenantId != _tenantContext.CurrentTenantId)
                {
                    throw new InvalidOperationException(
                        $"Cross-Tenant Violation: Cannot create entity with TenantId '{entry.Entity.TenantId}' inside tenant scope '{_tenantContext.CurrentTenantId}'.");
                }
            }
            else if (entry.State == EntityState.Modified || entry.State == EntityState.Deleted)
            {
                if (entry.Entity.TenantId != _tenantContext.CurrentTenantId)
                {
                    throw new InvalidOperationException(
                        $"Cross-Tenant Violation: Cannot modify or delete entity with TenantId '{entry.Entity.TenantId}' inside tenant scope '{_tenantContext.CurrentTenantId}'.");
                }
            }
        }
    }
}

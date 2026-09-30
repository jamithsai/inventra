using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Storage;

public class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3? _s3Client;
    private readonly ITenantContext _tenantContext;
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<S3FileStorageService> _logger;
    private readonly string _bucketName;
    private readonly string _localStorageRoot;

    public S3FileStorageService(
        ITenantContext tenantContext,
        AppDbContext dbContext,
        IConfiguration configuration,
        ILogger<S3FileStorageService> logger,
        IAmazonS3? s3Client = null)
    {
        _tenantContext = tenantContext;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
        _s3Client = s3Client;
        _bucketName = _configuration["AWS:BucketName"] ?? "multi-tenant-inventory-storage-prod";
        _localStorageRoot = Path.Combine(AppContext.BaseDirectory, "LocalStorage");
    }

    private bool HasAwsCredentials()
    {
        var key = _configuration["AWS:AccessKey"] ?? Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
        return !string.IsNullOrEmpty(key) && _s3Client != null;
    }

    public async Task<TenantFile> UploadFileAsync(
        Stream fileStream,
        string originalFileName,
        string contentType,
        long fileSizeBytes,
        string? associatedItemId = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.CurrentTenantId;
        if (string.IsNullOrEmpty(tenantId))
        {
            throw new InvalidOperationException("Cannot upload file: Tenant context is not resolved.");
        }

        var safeFileName = Path.GetFileName(originalFileName).Replace(" ", "_");
        var uniquePrefix = Guid.NewGuid().ToString("N")[..8];
        var s3Key = $"tenants/{tenantId}/products/{uniquePrefix}_{safeFileName}";

        string? associatedItemName = null;
        if (!string.IsNullOrEmpty(associatedItemId))
        {
            var item = await _dbContext.InventoryItems.FindAsync(new object[] { associatedItemId }, cancellationToken);
            associatedItemName = item?.Name;
        }

        // 1. Upload to AWS S3 or Local Mock Partition
        if (HasAwsCredentials() && _s3Client != null)
        {
            _logger.LogInformation("Uploading to AWS S3 Bucket '{Bucket}' with Key '{Key}'", _bucketName, s3Key);
            var putRequest = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = s3Key,
                InputStream = fileStream,
                ContentType = contentType,
                AutoCloseStream = false
            };
            putRequest.Metadata.Add("x-amz-meta-tenant-id", tenantId);
            await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        }
        else
        {
            // Local Storage fallback preserving exact /tenants/{tenantId}/products/ prefix
            var localPath = Path.Combine(_localStorageRoot, s3Key.Replace('/', Path.DirectorySeparatorChar));
            var dir = Path.GetDirectoryName(localPath)!;
            Directory.CreateDirectory(dir);

            using var outputStream = new FileStream(localPath, FileMode.Create, FileAccess.Write);
            await fileStream.CopyToAsync(outputStream, cancellationToken);
            _logger.LogInformation("Stored in local tenant path: {Path}", localPath);
        }

        // 2. Persist TenantFile Record
        var tenantFile = new TenantFile
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            FileName = safeFileName,
            S3Key = s3Key,
            FileSizeBytes = fileSizeBytes,
            ContentType = contentType,
            UploadedAt = DateTime.UtcNow,
            AssociatedItemId = associatedItemId,
            AssociatedItemName = associatedItemName,
            DownloadUrl = $"/api/files/stream/{s3Key}"
        };

        _dbContext.TenantFiles.Add(tenantFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Audit Log
        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = tenantId,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "FILE_UPLOADED",
            EntityType = "TenantFile",
            EntityId = tenantFile.Id,
            Details = $"Uploaded S3 file '{safeFileName}' to key '{s3Key}' ({fileSizeBytes} bytes)."
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return tenantFile;
    }

    public async Task<(Stream? Stream, string ContentType, string FileName)> GetFileAsync(
        string fileId,
        CancellationToken cancellationToken = default)
    {
        // Query through EF Core Global Query Filter guarantees only active tenant's file is returned
        var file = await _dbContext.TenantFiles
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
        {
            return (null, string.Empty, string.Empty);
        }

        // Double check tenant key integrity
        if (!file.S3Key.StartsWith($"tenants/{_tenantContext.CurrentTenantId}/"))
        {
            _logger.LogCritical("CRITICAL: S3 Key {Key} does not match TenantContext {TenantId}", file.S3Key, _tenantContext.CurrentTenantId);
            throw new UnauthorizedAccessException("Cross-tenant file access blocked.");
        }

        if (HasAwsCredentials() && _s3Client != null)
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _bucketName,
                Key = file.S3Key
            };
            var response = await _s3Client.GetObjectAsync(getRequest, cancellationToken);
            return (response.ResponseStream, file.ContentType, file.FileName);
        }
        else
        {
            var localPath = Path.Combine(_localStorageRoot, file.S3Key.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(localPath))
            {
                return (null, string.Empty, string.Empty);
            }
            var stream = new FileStream(localPath, FileMode.Open, FileAccess.Read);
            return (stream, file.ContentType, file.FileName);
        }
    }

    public async Task<bool> DeleteFileAsync(string fileId, CancellationToken cancellationToken = default)
    {
        var file = await _dbContext.TenantFiles
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
            return false;

        // Delete from S3 / Local
        try
        {
            if (HasAwsCredentials() && _s3Client != null)
            {
                await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = file.S3Key
                }, cancellationToken);
            }
            else
            {
                var localPath = Path.Combine(_localStorageRoot, file.S3Key.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(localPath))
                {
                    File.Delete(localPath);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete physical storage object for key '{Key}'. Continuing database record cleanup.", file.S3Key);
        }

        _dbContext.TenantFiles.Remove(file);

        _dbContext.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = _tenantContext.CurrentTenantId!,
            UserId = _tenantContext.CurrentUserId ?? "system",
            UserName = _tenantContext.CurrentUserName ?? "Admin",
            Action = "FILE_DELETED",
            EntityType = "TenantFile",
            EntityId = file.Id,
            Details = $"Deleted file '{file.FileName}' from key '{file.S3Key}'."
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public string GetDownloadUrl(TenantFile file)
    {
        return $"/api/files/{file.Id}/download";
    }
}

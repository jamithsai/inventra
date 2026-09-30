using MultiTenantInventory.Api.Models;

namespace MultiTenantInventory.Api.Storage;

public interface IFileStorageService
{
    /// <summary>
    /// Uploads a file for the current tenant.
    /// S3 Key is guaranteed to follow: tenants/{currentTenantId}/products/{fileName}
    /// </summary>
    Task<TenantFile> UploadFileAsync(
        Stream fileStream, 
        string originalFileName, 
        string contentType, 
        long fileSizeBytes, 
        string? associatedItemId = null, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads a file stream ensuring the file belongs strictly to the active tenant.
    /// </summary>
    Task<(Stream? Stream, string ContentType, string FileName)> GetFileAsync(
        string fileId, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a file from S3 bucket ensuring tenant isolation.
    /// </summary>
    Task<bool> DeleteFileAsync(string fileId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a signed or accessible URL for the tenant S3 file.
    /// </summary>
    string GetDownloadUrl(TenantFile file);
}

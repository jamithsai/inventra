namespace MultiTenantInventory.Api.Models;

public class TenantFile : ITenantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string S3Key { get; set; } = string.Empty; // e.g. "tenants/acme-retail/products/abc.png"
    public long FileSizeBytes { get; set; }
    public string ContentType { get; set; } = "application/octet-stream";
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? DownloadUrl { get; set; }
    public string? AssociatedItemId { get; set; }
    public string? AssociatedItemName { get; set; }
}

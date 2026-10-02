using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MultiTenantInventory.Api.Data;
using MultiTenantInventory.Api.Models;
using MultiTenantInventory.Api.Services;
using MultiTenantInventory.Api.Storage;
using MultiTenantInventory.Api.Tenant;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _fileStorageService;
    private readonly AppDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IInventoryNotificationService _notificationService;

    public FilesController(
        IFileStorageService fileStorageService, 
        AppDbContext dbContext, 
        ITenantContext tenantContext,
        IInventoryNotificationService notificationService)
    {
        _fileStorageService = fileStorageService;
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllFiles()
    {
        // Global Query Filter limits records to active tenant
        var files = await _dbContext.TenantFiles
            .OrderByDescending(f => f.UploadedAt)
            .ToListAsync();

        return Ok(files);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetFileById(string id)
    {
        var file = await _dbContext.TenantFiles
            .FirstOrDefaultAsync(f => f.Id == id);

        if (file == null)
        {
            return NotFound(new 
            { 
                error = "FileNotFound", 
                message = $"File '{id}' not found in active tenant '{_tenantContext.CurrentTenantId}'." 
            });
        }

        return Ok(file);
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile file, 
        [FromForm] string? associatedItemId)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "EmptyFile", message = "Please upload a non-empty file." });
        }

        using var stream = file.OpenReadStream();
        var uploadedFile = await _fileStorageService.UploadFileAsync(
            stream, 
            file.FileName, 
            file.ContentType, 
            file.Length, 
            associatedItemId, 
            HttpContext.RequestAborted);

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        _ = _notificationService.NotifyFileUploadedAsync(tenantId, uploadedFile, userId, userName);

        return CreatedAtAction(nameof(GetFileById), new { id = uploadedFile.Id }, uploadedFile);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var fileRecord = await _dbContext.TenantFiles.FirstOrDefaultAsync(f => f.Id == id);
        var fileName = fileRecord?.FileName ?? id;

        var success = await _fileStorageService.DeleteFileAsync(id, HttpContext.RequestAborted);
        if (!success)
        {
            return NotFound(new 
            { 
                error = "FileNotFound", 
                message = $"Cannot delete file '{id}': Record not found in tenant '{_tenantContext.CurrentTenantId}'." 
            });
        }

        var tenantId = _tenantContext.CurrentTenantId!;
        var userId = _tenantContext.CurrentUserId ?? "system";
        var userName = _tenantContext.CurrentUserName ?? "Admin";

        _ = _notificationService.NotifyFileDeletedAsync(tenantId, id, fileName, userId, userName);

        return Ok(new { success = true, message = $"File '{id}' deleted from S3 tenant bucket." });
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(string id)
    {
        var (stream, contentType, fileName) = await _fileStorageService.GetFileAsync(id, HttpContext.RequestAborted);
        if (stream == null)
        {
            return NotFound(new { error = "FileNotFound", message = "File content could not be located." });
        }

        return File(stream, contentType, fileName);
    }
}

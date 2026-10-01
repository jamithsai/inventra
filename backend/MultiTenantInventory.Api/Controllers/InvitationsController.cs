using Microsoft.AspNetCore.Mvc;
using MultiTenantInventory.Api.DTOs;
using MultiTenantInventory.Api.Services;

namespace MultiTenantInventory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvitationsController : ControllerBase
{
    private readonly ITenantProvisioningService _provisioningService;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(
        ITenantProvisioningService provisioningService,
        ILogger<InvitationsController> logger)
    {
        _provisioningService = provisioningService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve invitation details for a given token (Public endpoint used by the invitation acceptance page).
    /// </summary>
    [HttpGet("{token}")]
    public async Task<IActionResult> GetInvitation(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { error = "InvalidToken", message = "Invitation token is required." });
        }

        var invitation = await _provisioningService.GetInvitationByTokenAsync(token);
        if (invitation == null)
        {
            return NotFound(new { error = "InvitationNotFound", message = "Invitation token is invalid or has expired." });
        }

        return Ok(invitation);
    }

    /// <summary>
    /// Accept invitation, establish account password, and activate tenant administrative membership.
    /// </summary>
    [HttpPost("{token}/accept")]
    public async Task<IActionResult> AcceptInvitation(string token, [FromBody] AcceptInvitationDto request)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { error = "InvalidToken", message = "Invitation token is required." });
        }

        try
        {
            var user = await _provisioningService.AcceptInvitationAsync(token, request);
            return Ok(new
            {
                message = "Invitation accepted successfully! Your tenant administrator account has been activated.",
                user
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = "ValidationError", message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = "InvitationNotFound", message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = "InvitationInvalid", message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error activating invitation.");
            return StatusCode(500, new { error = "ActivationError", message = "Failed to activate invitation due to an internal server error." });
        }
    }
}

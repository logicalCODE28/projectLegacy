using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly NotificationService _service;

        public NotificationsController(NotificationService service)
        {
            _service = service;
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetByUser(string userId) => Ok(await _service.GetByUserAsync(userId));

        [HttpGet("user/{userId}/unread")]
        public async Task<IActionResult> GetUnread(string userId) => Ok(await _service.GetUnreadByUserAsync(userId));

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Notification notification)
        {
            await _service.CreateAsync(notification);
            return CreatedAtAction(null, new { id = notification.Id }, notification);
        }

        [HttpPost("user/{userId}/markread")]
        public async Task<IActionResult> MarkRead(string userId)
        {
            await _service.MarkReadAsync(userId);
            return NoContent();
        }
    }
}

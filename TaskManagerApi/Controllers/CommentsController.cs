using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly CommentService _service;
        private readonly TaskService _taskService;

        public CommentsController(CommentService service, TaskService taskService)
        {
            _service = service;
            _taskService = taskService;
        }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _service.GetAllAsync());

        [HttpGet("task/{taskId}")]
        public async Task<IActionResult> GetByTask(string taskId)
        {
            var resolved = await _taskService.ResolveLegacyIdAsync(taskId);
            return Ok(await _service.GetByTaskIdAsync(resolved ?? taskId));
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Comment comment)
        {
            await _service.CreateAsync(comment);
            return CreatedAtAction(null, new { id = comment.Id }, comment);
        }
    }
}

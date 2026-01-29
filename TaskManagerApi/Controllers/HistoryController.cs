using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HistoryController : ControllerBase
    {
        private readonly HistoryService _service;
        private readonly TaskService _taskService;

        public HistoryController(HistoryService service, TaskService taskService)
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
        public async Task<IActionResult> Post([FromBody] HistoryEntry entry)
        {
            await _service.CreateAsync(entry);
            return CreatedAtAction(null, new { id = entry.Id }, entry);
        }
    }
}

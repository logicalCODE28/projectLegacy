using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly TaskService _service;
        private readonly HistoryService _historyService;
        private readonly NotificationService _notificationService;

        public TasksController(TaskService service, HistoryService historyService, NotificationService notificationService)
        {
            _service = service;
            _historyService = historyService;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] string? status, [FromQuery] string? priority, [FromQuery] string? projectId)
        {
            var items = await _service.GetFilteredAsync(q, status, priority, projectId);
            return Ok(items);
        }

        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv()
        {
            // Delegate to reports controller logic via service composition here
            var tasks = await _service.GetAllAsync();
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("ID,Título,Estado,Prioridad,Proyecto");
            // Fallback: just output basic fields (ProjectId used instead of project name)
            foreach (var t in tasks)
            {
                sb.AppendLine($"{t.Id},\"{t.Title}\",\"{t.Status}\",\"{t.Priority}\",\"{t.ProjectId ?? "Sin proyecto"}\"");
            }
            var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", "export_tasks.csv");
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] TaskItem task)
        {
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _service.CreateAsync(task);

            // Add history entry
            await _historyService.CreateAsync(new Models.HistoryEntry {
                TaskId = task.Id ?? string.Empty,
                UserId = task.CreatedBy ?? string.Empty,
                Action = "CREATED",
                OldValue = string.Empty,
                NewValue = task.Title
            });

            // Create notification if assigned
            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                await _notificationService.CreateAsync(new Models.Notification {
                    UserId = task.AssignedTo,
                    Message = $"Nueva tarea asignada: {task.Title}",
                    Type = "task_assigned"
                });
            }

            return CreatedAtAction(nameof(Get), new { id = task.Id }, task);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put(string id, [FromBody] TaskItem task)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            // Detect changes for history
            if (existing.Status != task.Status)
            {
                await _historyService.CreateAsync(new Models.HistoryEntry {
                    TaskId = id,
                    UserId = task.CreatedBy ?? string.Empty,
                    Action = "STATUS_CHANGED",
                    OldValue = existing.Status,
                    NewValue = task.Status
                });
            }

            if (existing.Title != task.Title)
            {
                await _historyService.CreateAsync(new Models.HistoryEntry {
                    TaskId = id,
                    UserId = task.CreatedBy ?? string.Empty,
                    Action = "TITLE_CHANGED",
                    OldValue = existing.Title,
                    NewValue = task.Title
                });
            }

            await _service.UpdateAsync(id, task);

            if (!string.IsNullOrEmpty(task.AssignedTo))
            {
                await _notificationService.CreateAsync(new Models.Notification {
                    UserId = task.AssignedTo,
                    Message = $"Tarea actualizada: {task.Title}",
                    Type = "task_updated"
                });
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            await _historyService.CreateAsync(new Models.HistoryEntry {
                TaskId = id,
                UserId = existing.CreatedBy ?? string.Empty,
                Action = "DELETED",
                OldValue = existing.Title,
                NewValue = string.Empty
            });

            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}

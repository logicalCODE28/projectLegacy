using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Services;
using System.Text;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly TaskService _taskService;
        private readonly ProjectService _projectService;
        private readonly UserService _userService;

        public ReportsController(TaskService taskService, ProjectService projectService, UserService userService)
        {
            _taskService = taskService;
            _projectService = projectService;
            _userService = userService;
        }

        [HttpGet("tasks-by-status")]
        public async Task<IActionResult> TasksByStatus()
        {
            var tasks = await _taskService.GetAllAsync();
            var result = tasks.GroupBy(t => t.Status ?? "Pendiente").ToDictionary(g => g.Key, g => g.Count());
            return Ok(result);
        }

        [HttpGet("projects-count")]
        public async Task<IActionResult> ProjectsCount()
        {
            var projects = await _projectService.GetAllAsync();
            var tasks = await _taskService.GetAllAsync();
            var result = projects.ToDictionary(p => p.Name, p => tasks.Count(t => t.ProjectId == p.Id));
            return Ok(result);
        }

        [HttpGet("users-count")]
        public async Task<IActionResult> UsersCount()
        {
            var users = await _userService.GetAllAsync();
            var tasks = await _taskService.GetAllAsync();
            var result = users.ToDictionary(u => u.Username, u => tasks.Count(t => t.AssignedTo == u.Id));
            return Ok(result);
        }

        [HttpGet("export/tasks/csv")]
        public async Task<IActionResult> ExportTasksCsv()
        {
            var tasks = await _taskService.GetAllAsync();
            var projects = await _projectService.GetAllAsync();

            var sb = new StringBuilder();
            sb.AppendLine("ID,Título,Estado,Prioridad,Proyecto");
            foreach (var t in tasks)
            {
                var proj = projects.FirstOrDefault(p => p.Id == t.ProjectId)?.Name ?? "Sin proyecto";
                sb.AppendLine($"{t.Id},\"{t.Title}\",\"{t.Status ?? "Pendiente"}\",\"{t.Priority ?? "Media"}\",\"{proj}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", "export_tasks.csv");
        }
    }
}

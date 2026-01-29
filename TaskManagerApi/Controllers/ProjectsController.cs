using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly ProjectService _service;

        public ProjectsController(ProjectService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Project project)
        {
            await _service.CreateAsync(project);
            return CreatedAtAction(nameof(Get), new { id = project.Id }, project);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put(string id, [FromBody] Project project)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();
            await _service.UpdateAsync(id, project);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();
            await _service.DeleteAsync(id);
            return NoContent();
        }
    }
}

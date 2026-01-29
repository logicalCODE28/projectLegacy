using Microsoft.AspNetCore.Mvc;
using TaskManagerApi.Models;
using TaskManagerApi.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserService _service;

        public UsersController(UserService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var users = await _service.GetAllAsync();
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(string id)
        {
            var user = await _service.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] User user)
        {
            await _service.CreateAsync(user);
            return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
        }
    }
}

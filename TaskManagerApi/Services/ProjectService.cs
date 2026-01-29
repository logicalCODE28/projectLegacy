using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Services
{
    public class ProjectService
    {
        private readonly MongoDbContext _db;

        public ProjectService(MongoDbContext db)
        {
            _db = db;
        }

        public async Task<List<Project>> GetAllAsync()
        {
            return await _db.Projects.Find(_ => true).ToListAsync();
        }

        public async Task<Project?> GetByIdAsync(string id)
        {
            return await _db.Projects.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(Project project)
        {
            await _db.Projects.InsertOneAsync(project);
        }

        public async Task UpdateAsync(string id, Project updated)
        {
            updated.Id = id;
            await _db.Projects.ReplaceOneAsync(p => p.Id == id, updated);
        }

        public async Task DeleteAsync(string id)
        {
            await _db.Projects.DeleteOneAsync(p => p.Id == id);
        }
    }
}

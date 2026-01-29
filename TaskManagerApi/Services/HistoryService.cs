using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Services
{
    public class HistoryService
    {
        private readonly MongoDbContext _db;

        public HistoryService(MongoDbContext db)
        {
            _db = db;
        }

        public async Task<List<HistoryEntry>> GetAllAsync()
        {
            return await _db.History.Find(_ => true).ToListAsync();
        }

        public async Task<List<HistoryEntry>> GetByTaskIdAsync(string taskId)
        {
            return await _db.History.Find(h => h.TaskId == taskId).ToListAsync();
        }

        public async Task CreateAsync(HistoryEntry entry)
        {
            entry.Timestamp = DateTime.UtcNow;
            await _db.History.InsertOneAsync(entry);
        }
    }
}

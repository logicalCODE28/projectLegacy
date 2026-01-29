using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;
using MongoDB.Bson;
using System.Collections.Generic;

namespace TaskManagerApi.Services
{
    public class TaskService
    {
        private readonly MongoDbContext _db;
        private readonly SequenceService _seq;

        public TaskService(MongoDbContext db, SequenceService seq)
        {
            _db = db;
            _seq = seq;
        }

        public async Task<List<TaskItem>> GetAllAsync()
        {
            return await _db.Tasks.Find(_ => true).ToListAsync();
        }

        public async Task<TaskItem?> GetByIdAsync(string id)
        {
            return await _db.Tasks.Find(t => t.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(TaskItem task)
        {
            // assign legacy numeric id if not present
            if (!task.LegacyId.HasValue)
            {
                try { task.LegacyId = await _seq.NextAsync("task"); } catch { task.LegacyId = null; }
            }
            await _db.Tasks.InsertOneAsync(task);
        }

        public async Task UpdateAsync(string id, TaskItem updated)
        {
            updated.Id = id;
            updated.UpdatedAt = DateTime.UtcNow;
            await _db.Tasks.ReplaceOneAsync(t => t.Id == id, updated);
        }

        public async Task DeleteAsync(string id)
        {
            await _db.Tasks.DeleteOneAsync(t => t.Id == id);
        }

        public async Task<List<TaskItem>> GetFilteredAsync(string? searchText, string? status, string? priority, string? projectId)
        {
            var builder = Builders<TaskItem>.Filter;
            var filters = new List<FilterDefinition<TaskItem>>();

            if (!string.IsNullOrEmpty(searchText))
            {
                var regex = new BsonRegularExpression(searchText, "i");
                filters.Add(builder.Or(builder.Regex(t => t.Title, regex), builder.Regex(t => t.Description, regex)));
            }

            if (!string.IsNullOrEmpty(status))
            {
                filters.Add(builder.Eq(t => t.Status, status));
            }

            if (!string.IsNullOrEmpty(priority))
            {
                filters.Add(builder.Eq(t => t.Priority, priority));
            }

            if (!string.IsNullOrEmpty(projectId))
            {
                filters.Add(builder.Eq(t => t.ProjectId, projectId));
            }

            var filter = filters.Count == 0 ? builder.Empty : builder.And(filters);
            return await _db.Tasks.Find(filter).ToListAsync();
        }

        // Resolve a legacy numeric id ("1","2") into the stored ObjectId string
        public async Task<string?> ResolveLegacyIdAsync(string legacyOrId)
        {
            if (int.TryParse(legacyOrId, out var n))
            {
                var item = await _db.Tasks.Find(t => t.LegacyId == n).FirstOrDefaultAsync();
                return item?.Id;
            }
            // otherwise assume it's already an object id / guid
            return legacyOrId;
        }
    }
}

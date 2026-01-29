using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Services
{
    public class CommentService
    {
        private readonly MongoDbContext _db;

        public CommentService(MongoDbContext db)
        {
            _db = db;
        }

        public async Task<List<Comment>> GetAllAsync()
        {
            return await _db.Comments.Find(_ => true).ToListAsync();
        }

        public async Task<List<Comment>> GetByTaskIdAsync(string taskId)
        {
            return await _db.Comments.Find(c => c.TaskId == taskId).ToListAsync();
        }

        public async Task<Comment?> GetByIdAsync(string id)
        {
            return await _db.Comments.Find(c => c.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(Comment comment)
        {
            comment.CreatedAt = DateTime.UtcNow;
            await _db.Comments.InsertOneAsync(comment);
        }
    }
}

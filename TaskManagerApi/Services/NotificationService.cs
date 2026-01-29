using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Services
{
    public class NotificationService
    {
        private readonly MongoDbContext _db;

        public NotificationService(MongoDbContext db)
        {
            _db = db;
        }

        public async Task<List<Notification>> GetByUserAsync(string userId)
        {
            return await _db.Notifications.Find(n => n.UserId == userId).ToListAsync();
        }

        public async Task<List<Notification>> GetUnreadByUserAsync(string userId)
        {
            return await _db.Notifications.Find(n => n.UserId == userId && !n.Read).ToListAsync();
        }

        public async Task CreateAsync(Notification notification)
        {
            notification.CreatedAt = DateTime.UtcNow;
            notification.Read = false;
            await _db.Notifications.InsertOneAsync(notification);
        }

        public async Task MarkReadAsync(string userId)
        {
            var update = Builders<Notification>.Update.Set(n => n.Read, true);
            await _db.Notifications.UpdateManyAsync(n => n.UserId == userId, update);
        }
    }
}

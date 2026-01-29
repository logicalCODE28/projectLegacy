using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Services
{
    public class UserService
    {
        private readonly MongoDbContext _db;

        public UserService(MongoDbContext db)
        {
            _db = db;
        }

        public async Task<List<User>> GetAllAsync()
        {
            return await _db.Users.Find(_ => true).ToListAsync();
        }

        public async Task<User?> GetByIdAsync(string id)
        {
            return await _db.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreateAsync(User user)
        {
            await _db.Users.InsertOneAsync(user);
        }
    }
}

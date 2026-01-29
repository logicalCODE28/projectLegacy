using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace TaskManagerApi.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IOptions<MongoSettings> options)
        {
            var settings = options.Value;
            var client = new MongoClient(settings.ConnectionString);
            _database = client.GetDatabase(settings.DatabaseName);
        }

    // Expose the underlying database for administrative operations
    public IMongoDatabase Database => _database;

        public IMongoCollection<Models.User> Users => _database.GetCollection<Models.User>("users");
        public IMongoCollection<Models.Project> Projects => _database.GetCollection<Models.Project>("projects");
        public IMongoCollection<Models.TaskItem> Tasks => _database.GetCollection<Models.TaskItem>("tasks");
        public IMongoCollection<Models.Comment> Comments => _database.GetCollection<Models.Comment>("comments");
        public IMongoCollection<Models.HistoryEntry> History => _database.GetCollection<Models.HistoryEntry>("history");
        public IMongoCollection<Models.Notification> Notifications => _database.GetCollection<Models.Notification>("notifications");
    }
}
